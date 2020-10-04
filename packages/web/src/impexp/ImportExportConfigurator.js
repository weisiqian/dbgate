import React from 'react';
import _ from 'lodash';
import FormStyledButton from '../widgets/FormStyledButton';
import { useFormikContext } from 'formik';
import styled from 'styled-components';
import {
  FormReactSelect,
  FormConnectionSelect,
  FormDatabaseSelect,
  FormTablesSelect,
  FormSchemaSelect,
} from '../utility/forms';
import { useDatabaseInfo } from '../utility/metadataLoaders';
import TableControl, { TableColumn } from '../utility/TableControl';
import { TextField, SelectField } from '../utility/inputs';
import { getActionOptions, getTargetName, isFileStorage } from './createImpExpScript';
import getElectron from '../utility/getElectron';
import ErrorInfo from '../widgets/ErrorInfo';
import getAsArray from '../utility/getAsArray';
import axios from '../utility/axios';
import LoadingInfo from '../widgets/LoadingInfo';

const Container = styled.div`
  max-height: 50vh;
  overflow-y: scroll;
`;

const Wrapper = styled.div`
  display: flex;
`;

const Column = styled.div`
  margin: 10px;
  flex: 1;
`;

const Label = styled.div`
  margin: 5px;
  margin-top: 15px;
  color: #777;
`;

const SourceNameWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const TrashWrapper = styled.div`
  &:hover {
    background-color: #ccc;
  }
  cursor: pointer;
  color: blue;
`;

function getFileFilters(storageType) {
  const res = [];
  if (storageType == 'csv') res.push({ name: 'CSV files', extensions: ['csv'] });
  if (storageType == 'jsonl') res.push({ name: 'JSON lines', extensions: ['jsonl'] });
  if (storageType == 'excel') res.push({ name: 'MS Excel files', extensions: ['xlsx'] });
  res.push({ name: 'All Files', extensions: ['*'] });
  return res;
}

async function addFilesToSourceList(files, values, setFieldValue) {
  const newSources = [];
  const storage = values.sourceStorageType;
  for (const file of getAsArray(files)) {
    if (isFileStorage(storage)) {
      if (storage == 'excel') {
        const resp = await axios.get(`files/analyse-excel?filePath=${encodeURIComponent(file.full)}`);
        /** @type {import('@dbgate/types').DatabaseInfo} */
        const structure = resp.data;
        for (const table of structure.tables) {
          const sourceName = table.pureName;
          newSources.push(sourceName);
          setFieldValue(`sourceFile_${sourceName}`, {
            fileName: file.full,
            sheetName: table.pureName,
          });
        }
      } else {
        const sourceName = file.name;
        newSources.push(sourceName);
        setFieldValue(`sourceFile_${sourceName}`, {
          fileName: file.full,
        });
      }
    }
  }
  setFieldValue('sourceList', [...(values.sourceList || []).filter((x) => !newSources.includes(x)), ...newSources]);
}

function ElectronFilesInput() {
  const { values, setFieldValue } = useFormikContext();
  const electron = getElectron();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    const files = electron.remote.dialog.showOpenDialogSync(electron.remote.getCurrentWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: getFileFilters(values.sourceStorageType),
    });
    if (files) {
      const path = window.require('path');
      try {
        setIsLoading(true);
        await addFilesToSourceList(
          files.map((full) => ({
            full,
            ...path.parse(full),
          })),
          values,
          setFieldValue
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <FormStyledButton type="button" value="Add file(s)" onClick={handleClick} />
      {isLoading && <LoadingInfo message="Anaysing input files" />}
    </>
  );
}

function FilesInput() {
  const electron = getElectron();
  if (electron) {
    return <ElectronFilesInput />;
  }
  return <ErrorInfo message="Import files is currently implemented only for electron client" />;
}

function SourceTargetConfig({
  direction,
  storageTypeField,
  connectionIdField,
  databaseNameField,
  schemaNameField,
  tablesField = undefined,
}) {
  const { values, setFieldValue } = useFormikContext();
  const types =
    values[storageTypeField] == 'jsldata'
      ? [{ value: 'jsldata', label: 'Query result data', directions: ['source'] }]
      : [
          { value: 'database', label: 'Database', directions: ['source', 'target'] },
          { value: 'csv', label: 'CSV file(s)', directions: ['source', 'target'] },
          { value: 'jsonl', label: 'JSON lines file(s)', directions: ['source', 'target'] },
          { value: 'excel', label: 'MS Excel file(s)', directions: ['source'] },
        ];
  const storageType = values[storageTypeField];
  const dbinfo = useDatabaseInfo({ conid: values[connectionIdField], database: values[databaseNameField] });
  return (
    <Column>
      {direction == 'source' && <Label>Source configuration</Label>}
      {direction == 'target' && <Label>Target configuration</Label>}
      <FormReactSelect options={types.filter((x) => x.directions.includes(direction))} name={storageTypeField} />
      {storageType == 'database' && (
        <>
          <Label>Server</Label>
          <FormConnectionSelect name={connectionIdField} />
          <Label>Database</Label>
          <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} />
          <Label>Schema</Label>
          <FormSchemaSelect conidName={connectionIdField} databaseName={databaseNameField} name={schemaNameField} />
          {tablesField && (
            <>
              <Label>Tables/views</Label>
              <FormTablesSelect
                conidName={connectionIdField}
                schemaName={schemaNameField}
                databaseName={databaseNameField}
                name={tablesField}
              />
              <div>
                <FormStyledButton
                  type="button"
                  value="All tables"
                  onClick={() =>
                    setFieldValue(
                      'sourceList',
                      _.uniq([...(values.sourceList || []), ...(dbinfo && dbinfo.tables.map((x) => x.pureName))])
                    )
                  }
                />
                <FormStyledButton
                  type="button"
                  value="All views"
                  onClick={() =>
                    setFieldValue(
                      'sourceList',
                      _.uniq([...(values.sourceList || []), ...(dbinfo && dbinfo.views.map((x) => x.pureName))])
                    )
                  }
                />
                <FormStyledButton type="button" value="Remove all" onClick={() => setFieldValue('sourceList', [])} />
              </div>
            </>
          )}
        </>
      )}
      {isFileStorage(storageType) && direction == 'source' && <FilesInput />}
    </Column>
  );
}

function SourceName({ name }) {
  const { values, setFieldValue } = useFormikContext();
  const handleDelete = () => {
    setFieldValue(
      'sourceList',
      values.sourceList.filter((x) => x != name)
    );
  };

  return (
    <SourceNameWrapper>
      <div>{name}</div>
      <TrashWrapper onClick={handleDelete}>
        <i className="fas fa-trash" />
      </TrashWrapper>
    </SourceNameWrapper>
  );
}

export default function ImportExportConfigurator() {
  const { values, setFieldValue } = useFormikContext();
  const targetDbinfo = useDatabaseInfo({ conid: values.targetConnectionId, database: values.targetDatabaseName });
  const { sourceList } = values;

  return (
    <Container>
      <Wrapper>
        <SourceTargetConfig
          direction="source"
          storageTypeField="sourceStorageType"
          connectionIdField="sourceConnectionId"
          databaseNameField="sourceDatabaseName"
          schemaNameField="sourceSchemaName"
          tablesField="sourceList"
        />
        <SourceTargetConfig
          direction="target"
          storageTypeField="targetStorageType"
          connectionIdField="targetConnectionId"
          databaseNameField="targetDatabaseName"
          schemaNameField="targetSchemaName"
        />
      </Wrapper>
      <TableControl rows={sourceList || []}>
        <TableColumn fieldName="source" header="Source" formatter={(row) => <SourceName name={row} />} />
        <TableColumn
          fieldName="action"
          header="Action"
          formatter={(row) => (
            <SelectField
              options={getActionOptions(row, values, targetDbinfo)}
              value={values[`actionType_${row}`] || getActionOptions(row, values, targetDbinfo)[0].value}
              onChange={(e) => setFieldValue(`actionType_${row}`, e.target.value)}
            />
          )}
        />
        <TableColumn
          fieldName="target"
          header="Target"
          formatter={(row) => (
            <TextField
              value={getTargetName(row, values)}
              onChange={(e) => setFieldValue(`targetName_${row}`, e.target.value)}
            />
          )}
        />
      </TableControl>
    </Container>
  );
}
