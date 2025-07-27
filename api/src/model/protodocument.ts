import mysql, { Connection, FieldPacket, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { Types } from '../types/common';
import { User } from './user';

export class DocumentError extends Error {
    code: Types.DocumentErrorCode;
    constructor(code: Types.DocumentErrorCode, message?: string) {
        super(message);
        this.code = code;
    }
    get json() {
        return {
            code: this.code,
            shortName: Object.values(Types.DocumentErrorCode)[this.code],
            message: this.message,
        };
    }
}

export const DocumentBaseSchema: ITableFieldSchema[] = [
    { name: `id`, type: 'bigint(20)', required: true, autoIncrement: true, comment: 'Unique identificator of document or child record' },
    { name: `locked`, type: 'tinyint(1)', required: true, default: '0', comment: 'Is Document locked for changes' },
    { name: `lockedByUser`, type: 'varchar(128)', comment: 'User name who locked Document the last' },
    { name: `blocked`, type: 'tinyint(1)', required: true, default: '0', comment: 'Is Document blocked' },
    { name: `wfStatus`, type: 'INT(11)', comment: 'Workflow status of Document' },
    { name: `wfHistory`, type: 'json', comment: 'Workflow history of Document' },
    { name: `createdByUser`, type: 'varchar(128)', comment: 'User login who created the Document' },
    { name: `changedByUser`, type: 'varchar(128)', comment: 'User login who changed the Document the last' },
    { name: `created`, type: 'timestamp', required: true, default: 'current_timestamp()', comment: 'Time when the document created' },
    { name: `changed`, type: 'timestamp', required: true, default: 'current_timestamp()', onUpdate: 'current_timestamp()', comment: 'Time when the document changed last time' },
];

export interface ITableFieldSchema {
    name: string;
    type: string;
    required?: boolean;
    autoIncrement?: boolean;
    default?: string;
    onUpdate?: string;
    comment?: string;
}

export interface ITableIndexSchema {
    fields: string[];
    indexType: string;
}

export interface IDocumentDataSchema {
    tableName: string;
    relatedTablesPrefix?: string;
    idFieldName: string;
    fields: ITableFieldSchema[];
    indexes?: ITableIndexSchema[];
    related?: IDocumentDataSchema[];
}

export interface IDocumentWFSchema {
    tableName: string;
    initialState: Types.WorkflowStatusCode;
    transfers?: {
        from: Types.WorkflowStatusCode;
        to: Types.WorkflowStatusCode;
    }[];
    related?: IDocumentWFSchema[];
}

export abstract class Document<DataType extends Types.IDocument, DBSchema extends IDocumentDataSchema, WFSchema extends IDocumentWFSchema> {
    private static _sqlConnection?: Connection;
    protected _dataSchema?: DBSchema;
    protected _id?: Types.ObjectId;
    protected _data?: DataType;
    protected _byUniqField?: { field: string; value: any };
    protected _collection?: { id: Types.ObjectId }[];
    constructor();
    constructor(id: Types.ObjectId);
    constructor(data: DataType);
    constructor(field: string, uniqueValue: any);
    constructor(...arg: any[]) {
        switch (arg.length) {
            case 0:
                break;
            //throw new DocumentError(DocumentErrorCode.unknown, `Couldn't create class '${this.constructor.name}' without data`)
            case 1:
                if (typeof arg[0] === 'object' && arg[0] !== undefined) {
                    if (arg[0].id !== undefined) this._id = arg[0].id;
                    else this._id = undefined;
                    this._data = arg[0];
                } else {
                    this._id = arg[0];
                }
                break;
            case 2:
                this._byUniqField = { field: arg[0], value: arg[1] };
                break;
            default:
                throw new DocumentError(Types.DocumentErrorCode.unknown, `Couldn't create class '${this.constructor.name}' too much data`);
        }
    }

    get dataSchema(): DBSchema {
        throw new DocumentError(Types.DocumentErrorCode.unknown, `Abstract class '${this.constructor.name}' has no data schema. Implement getter of 'dataSchema' property`);
    }

    get wfSchema(): WFSchema {
        throw new DocumentError(Types.DocumentErrorCode.unknown, `Abstract class '${this.constructor.name}' has no workflow schema. Implement getter of 'wfSchema' property`);
    }

    get sqlConnection(): Connection {
        if (Document._sqlConnection === undefined) throw new DocumentError(Types.DocumentErrorCode.sql_connection_error, 'Connection is undefined');
        return Document._sqlConnection;
    }

    static async createSQLConnection(): Promise<Connection> {
        if (Document._sqlConnection !== undefined) {
            try {
                await Document._sqlConnection.query('SELECT 1');
            } catch (e: any) {
                console.log(`Connection to database is not longer alive, reconnecting...`);
                Document._sqlConnection = undefined;
            }
        }
        if (Document._sqlConnection === undefined) {
            const db_host = process.env.db_host;
            const db_name = process.env.db_name;
            const db_user = process.env.db_user;
            const db_pwd = process.env.db_pwd;
            const db_port = process.env.db_port === undefined ? undefined : parseInt(process.env.db_port);
            //mconsole.sqlinfo(`Creating database connection: database: '${db_name}'; user: '${db_user}'; pwd: ${db_pwd ? "'******'" : '-'}; host: '${db_host}'; port: '${db_port}'`);
            Document._sqlConnection = await mysql.createConnection({
                host: db_host,
                database: db_name,
                user: db_user,
                password: db_pwd,
                port: db_port,
                timezone: 'Z',
            });
        }
        if (Document._sqlConnection === undefined) throw new DocumentError(Types.DocumentErrorCode.sql_connection_error, 'Unable to connect database');
        //mconsole.sqlinfo(`Connection to database is successful!`);
        return Document._sqlConnection;
    }

    get id(): Types.ObjectId {
        if (this._id === undefined) throw new DocumentError(Types.DocumentErrorCode.abstract_method, `Object typeof '${this.constructor.name}' id = '${this._id}' has no data but used for active manipulation`);
        return this._id;
    }

    get data(): DataType {
        if (this._data === undefined) throw new DocumentError(Types.DocumentErrorCode.abstract_method, `Object typeof '${this.constructor.name}' id = '${this._id}' has no data but used for active manipulation`);
        return this._data;
    }

    async delete(): Promise<void> {
        await Document.createSQLConnection();
        if (this._id === undefined) return;
        await this.sqlConnection.beginTransaction();
        let sql = `DELETE FROM \`${this.dataSchema.tableName}\` WHERE \`${this.dataSchema.idFieldName}\` = ?`;
        let params = [this._id];
        //mconsole.sqlq(sql, params);
        while (true) {
            try {
                const [sh, fields] = await this.sqlConnection.query<ResultSetHeader>(sql, params);
                //mconsole.sqld(sh, fields);
                break;
            } catch (e: any) {
                if (e.code === 'ER_NO_SUCH_TABLE') {
                    await this.createMainTable();
                } else {
                    await this.sqlConnection.rollback();
                    throw e;
                }
            }
        }

        if (this.dataSchema.related !== undefined) {
            for (const relObj of this.dataSchema.related) {
                const arrProp = (this.data as any)[relObj.tableName];
                // collect all child record to delete old children
                sql = `DELETE FROM \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` WHERE \`${this.dataSchema.relatedTablesPrefix + relObj.idFieldName}\` = ?`;
                //mconsole.sqlq(sql, [this._id]);
                let [childRows, fields]: [RowDataPacket[], FieldPacket[]] = [[], []];
                while (true) {
                    try {
                        [childRows, fields] = await this.sqlConnection.query<RowDataPacket[]>(sql, [this._id]);
                        break;
                    } catch (e: any) {
                        if (e.code === 'ER_NO_SUCH_TABLE') {
                            await this.createRelatedTable(relObj);
                        } else {
                            await this.sqlConnection.rollback();
                            throw e;
                        }
                    }
                }
                /*if (childRows.length > 0) {
                    sql = `DELETE FROM \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` WHERE \`${relObj.idFieldName}\` IN (?)`;
                    const params = childRows.map(el => el[relObj.idFieldName]);
                    mconsole.sqlq(sql, params);
                    const res = await this.sqlConnection.query<ResultSetHeader>(sql, [params]);
                    mconsole.sqld(res);
                }*/
            }
        }
        await this.sqlConnection.commit();
    }

    async save(username?: string): Promise<DataType> {
        await Document.createSQLConnection();

        if (this._id === undefined && this._data !== undefined) {
            this._data.wfHistory = [{ wfStatus: this.wfSchema.initialState, created: new Date(), createdByUser: username }];
            this._data.wfStatus = this.wfSchema.initialState;
        }

        let schemaDefinedFields: ITableFieldSchema[] = this.dataSchema.fields;
        let wfSchemaDefinedFields: ITableFieldSchema[] = DocumentBaseSchema.filter(field => field.name !== 'created' && field.name !== 'changed');
        this.data.changedByUser = username;
        if (this._id === undefined) {
            this.data.createdByUser = username;
            schemaDefinedFields = this.dataSchema.fields.filter(field => (this.data as any)[field.name] !== undefined);
            wfSchemaDefinedFields = DocumentBaseSchema.filter(field => (this.data as any)[field.name] !== undefined);
        } else {
            if (this.data.wfHistory !== undefined && this.data.wfStatus !== undefined) {
                const lastWfStatus = this.data.wfHistory[this.data.wfHistory.length - 1].wfStatus;
                if (this.data.wfStatus !== lastWfStatus) {
                    this.data.wfHistory.push({ wfStatus: this.data.wfStatus, created: new Date(), createdByUser: username });
                }
            }
        }
        let sql: string;
        if (this._id === undefined)
            sql = `INSERT INTO \`${this.dataSchema.tableName}\` (${schemaDefinedFields.map(field => `\`${field.name}\``).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `\`${field.name}\``).join(',')}) VALUES (${schemaDefinedFields.map(field => `?`).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `?`).join(',')})`;
        else
            sql = `UPDATE \`${this.dataSchema.tableName}\` SET ${schemaDefinedFields.map(field => `\`${field.name}\` = ?`).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `\`${field.name}\` = ?`).join(',')} WHERE \`${this.dataSchema.idFieldName}\` = ?`;
        const params = [
            ...schemaDefinedFields.map(field => (field.type === 'json' ? JSON.stringify((this.data as any)[field.name]) : (this.data as any)[field.name])),
            ...wfSchemaDefinedFields.map(field => (field.type === 'json' ? JSON.stringify((this.data as any)[field.name]) : (this.data as any)[field.name])),
        ];
        if (this._id !== undefined) params.push(this._id);
        //mconsole.sqlq(sql, params);

        //checking structure by schema
        for (const [propName, propValue] of Object.entries(this.data)) {
            if (-1 === this.dataSchema.fields.findIndex(field => field.name === propName) && -1 === this.dataSchema.related?.findIndex(relObj => relObj.tableName === propName) && -1 === DocumentBaseSchema.findIndex(field => field.name === propName))
                console.warn(`Property '${propName}' is absent in schema of '${this.dataSchema.tableName}'`);
        }
        /*for (const field of this.schema.fields) {
            if (!(field.name in this.data)) console.warn(`Field '${field.name}' of schema '${this.schema.tableName}' is absent in interface of ${this.constructor.name}`);
        }*/

        await this.sqlConnection.beginTransaction();
        //insert main record
        while (true) {
            try {
                const [sh, fields] = await this.sqlConnection.query<ResultSetHeader>(sql, params);
                //mconsole.sqld(sh, fields);
                if (this._id === undefined) this._id = sh.insertId;
                break;
            } catch (e: any) {
                if (e.code === 'ER_NO_SUCH_TABLE') {
                    await this.createMainTable();
                } else {
                    await this.sqlConnection.rollback();
                    throw e;
                }
            }
        }
        if (this.dataSchema.related !== undefined) {
            for (const relObj of this.dataSchema.related) {
                if (relObj.tableName in this.data) {
                    const arrProp = (this.data as any)[relObj.tableName];
                    // collect all child record to delete old children
                    sql = `SELECT \`${relObj.idFieldName}\` FROM \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` WHERE \`${this.dataSchema.relatedTablesPrefix + relObj.idFieldName}\` = ?`;
                    //mconsole.sqlq(sql, [this._id]);
                    let [childRows, fields]: [RowDataPacket[], FieldPacket[]] = [[], []];
                    while (true) {
                        try {
                            [childRows, fields] = await this.sqlConnection.query<RowDataPacket[]>(sql, [this._id]);
                            break;
                        } catch (e: any) {
                            if (e.code === 'ER_NO_SUCH_TABLE') {
                                await this.createRelatedTable(relObj);
                            } else {
                                await this.sqlConnection.rollback();
                                throw e;
                            }
                        }
                    }

                    for (const element of arrProp) {
                        //calc initial state for child record
                        const initialState = this.wfSchema.related?.filter(el => el.tableName === relObj.tableName)?.at(0)?.initialState;
                        if (element.wfStatus === undefined) {
                            element.wfStatus = initialState;
                            element.wfHistory = [{ wfStatus: initialState, created: new Date(), createdByUser: username }];
                        }

                        let schemaDefinedFields = relObj.fields;
                        let wfSchemaDefinedFields = DocumentBaseSchema.filter(field => field.name !== 'created' && field.name !== 'changed');
                        (element as any).changedByUser = username;
                        if (element[relObj.idFieldName] === undefined) {
                            (element as any).createdByUser = username;
                            schemaDefinedFields = relObj.fields.filter(field => (element as any)[field.name] !== undefined);
                            wfSchemaDefinedFields = DocumentBaseSchema.filter(field => (element as any)[field.name] !== undefined);
                        }

                        if (element[relObj.idFieldName] === undefined) {
                            sql = `INSERT INTO \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\`(\`${this.dataSchema.relatedTablesPrefix + this.dataSchema.idFieldName}\`, ${schemaDefinedFields.map(field => `\`${field.name}\``).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `\`${field.name}\``).join(',')}) VALUES (?, ${schemaDefinedFields.map(field => `?`).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `?`).join(',')})`;
                        } else {
                            childRows = childRows.filter(rec => rec[relObj.idFieldName] !== element[relObj.idFieldName]);
                            sql = `UPDATE \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` SET \`${this.dataSchema.relatedTablesPrefix + this.dataSchema.idFieldName}\` = ?, ${schemaDefinedFields.map(field => `\`${field.name}\` = ?`).join(',')}${wfSchemaDefinedFields.length !== 0 ? ',' : ''} ${wfSchemaDefinedFields.map(field => `\`${field.name}\` = ?`).join(',')} WHERE \`${relObj.idFieldName}\` = ?`;
                        }
                        const params = [
                            this._id,
                            ...schemaDefinedFields.map(field => (field.type === 'json' ? JSON.stringify((element as any)[field.name]) : (element as any as any)[field.name])),
                            ...wfSchemaDefinedFields.map(field => (field.type === 'json' ? JSON.stringify((element as any)[field.name]) : (element as any)[field.name])),
                        ];
                        if (element[relObj.idFieldName] !== undefined) params.push(element[relObj.idFieldName]);
                        //mconsole.sqlq(sql, params);
                        while (true) {
                            try {
                                await this.sqlConnection.query<ResultSetHeader>(sql, params);
                                break;
                            } catch (e: any) {
                                if (e.code === 'ER_NO_SUCH_TABLE') {
                                    await this.createRelatedTable(relObj);
                                } else {
                                    await this.sqlConnection.rollback();
                                    throw e;
                                }
                            }
                        }
                    }
                    //its time to delete all disappered children
                    if (childRows.length > 0) {
                        sql = `DELETE FROM \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` WHERE \`${relObj.idFieldName}\` IN (?)`;
                        const params = childRows.map(el => el[relObj.idFieldName]);
                        //mconsole.sqlq(sql, params);
                        const res = await this.sqlConnection.query<ResultSetHeader>(sql, [params]);
                        //mconsole.sqld(res);
                    }
                } else {
                    console.warn(`Property ${relObj.tableName} not found`);
                }
            }
        }
        await this.sqlConnection.commit();
        await this.load();
        return this.data;
    }

    async load(data?: DataType) {
        if (data !== undefined) {
            this._data = data;
            this._id = this._data.id;
        } else {
            const ou: DataType = await this.loadFromDB();
            this.load(ou);
        }
    }

    protected buildSQL(field: ITableFieldSchema): string {
        return `\`${field.name}\` ${field.type === 'json' ? 'longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin' : field.type} ${field.required ? 'NOT NULL' : field.default !== undefined ? `DEFAULT ${field.default}` : 'DEFAULT NULL'} ${field.autoIncrement ? 'AUTO_INCREMENT' : ''} ${field.default !== undefined && field.required ? `DEFAULT ${field.default}` : ''} ${field.comment !== undefined ? `COMMENT '${field.comment}'` : ''} ${field.type === 'json' ? `CHECK (json_valid(\`${field.name}\`))` : ''} ${field.onUpdate !== undefined ? `ON UPDATE ${field.onUpdate}` : ''}`;
    }

    protected async createMainTable() {
        //mconsole.sqlinfo(`Creating main table of schema '${this.dataSchema.tableName}'`);
        let sql = `CREATE TABLE IF NOT EXISTS \`${this.dataSchema.tableName}\`(${this.dataSchema.fields.map(field => this.buildSQL(field)).join(',')}, ${DocumentBaseSchema.map(field => this.buildSQL(field)).join(',')}, PRIMARY KEY (\`${this.dataSchema.idFieldName}\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`;
        //mconsole.sqlq(`sql = '${sql}'`, []);
        await this.sqlConnection.query(sql);
        if (this.dataSchema.indexes !== undefined)
            for (const key of this.dataSchema.indexes) {
                sql = `ALTER TABLE \`${this.dataSchema.tableName}\` ADD ${key.indexType} (${key.fields.map(field => `\`${field}\``).join(',')});`;
                //mconsole.sqlq(`sql = '${sql}'`, []);
                await this.sqlConnection.query(sql);
                //mconsole.sqlinfo(`Index of '${this.dataSchema.tableName}' has created successfully`);
            }
        //mconsole.sqlinfo(`Main table of schema '${this.dataSchema.tableName}' has created successfully`);
    }

    protected async createRelatedTable(tableSchema: IDocumentDataSchema) {
        //mconsole.sqlinfo(`Creating related table '${tableSchema.tableName}' of schema '${this.dataSchema.tableName}'`);

        let sql = `CREATE TABLE IF NOT EXISTS \`${this.dataSchema.relatedTablesPrefix + tableSchema.tableName}\`(\`${this.dataSchema.relatedTablesPrefix + this.dataSchema.idFieldName}\` bigint(20) NOT NULL, ${tableSchema.fields.map(field => this.buildSQL(field)).join(',')}, ${DocumentBaseSchema.map(field => this.buildSQL(field)).join(',')}, PRIMARY KEY (\`${tableSchema.idFieldName}\`) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`;
        //mconsole.sqlq(`sql = '${sql}'`, []);
        await this.sqlConnection.query(sql);
        //mconsole.sqlinfo(`Related table '${tableSchema.tableName}' of schema '${this.dataSchema.tableName}' has created successfully`);

        if (tableSchema.indexes !== undefined)
            for (const key of tableSchema.indexes) {
                sql = `ALTER TABLE \`${this.dataSchema.relatedTablesPrefix + tableSchema.tableName}\` ADD ${key.indexType} (${key.fields.map(field => `\`${field}\``).join(',')});`;
                //mconsole.sqlq(`sql = '${sql}'`, []);
                await this.sqlConnection.query(sql);
                //mconsole.sqlinfo(`Index of '${this.dataSchema.relatedTablesPrefix + tableSchema.tableName}' has created successfully`);
            }

        //mconsole.sqlinfo(`Creating foreign key for related table ${tableSchema.tableName}' of schema '${this.dataSchema.tableName}'`);
        sql = `ALTER TABLE \`${this.dataSchema.relatedTablesPrefix + tableSchema.tableName}\` ADD FOREIGN KEY (\`${this.dataSchema.relatedTablesPrefix}${this.dataSchema.idFieldName}\`) REFERENCES \`${this.dataSchema.tableName}\`(\`${this.dataSchema.idFieldName}\`) ON DELETE RESTRICT ON UPDATE RESTRICT;`;
        //mconsole.sqlq(`sql = '${sql}'`, []);
        await this.sqlConnection.query(sql);
        //mconsole.sqlinfo(`Foreign key for related table ${tableSchema.tableName}' of schema '${this.dataSchema.tableName}' has created successfully`);
    }

    protected jsonTranslate(obj: any, schema: IDocumentDataSchema): DataType {
        schema.fields.forEach(field => {
            if (field.type === 'json') (obj as any)[field.name] = JSON.parse((obj as any)[field.name]);
            if ((obj as any)[field.name] === null) (obj as any)[field.name] = undefined;
        });
        DocumentBaseSchema.forEach(field => {
            if (field.type === 'json') (obj as any)[field.name] = JSON.parse((obj as any)[field.name]);
            if ((obj as any)[field.name] === null) (obj as any)[field.name] = undefined;
        });
        return obj;
    }

    public checkMandatory(obj: any, schema?: IDocumentDataSchema) {
        if (schema === undefined) schema = this.dataSchema;
        schema.fields.forEach(field => {
            if (field.required && (obj as any)[field.name] === undefined) throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `While checking of object '${this.constructor.name}' expected mandatory field value '${field.name}'`);
        });
        /*DocumentBaseSchema.forEach(field => {
            if (field.required && (obj as any)[field.name] === undefined) throw new DocumentError(DocumentErrorCode.parameter_expected, `While checking of object '${this.constructor.name}' expected mandatory field value '${field.name}'`);
        });*/
    }

    protected async loadFromDB(): Promise<DataType> {
        await Document.createSQLConnection();
        let [rows, fields]: [DataType[], FieldPacket[]] = [[], []];
        if (this._id === undefined) {
            if (this._byUniqField === undefined) throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `Unique value of object '${this.constructor.name}' is undefined and id is undefined too`);

            const sql = `SELECT \`id\` from \`${this.dataSchema.tableName}\` WHERE \`${this._byUniqField.field}\` = ?`;
            //mconsole.sqlq(sql, [this._byUniqField.value]);
            [rows, fields] = await this.sqlConnection.query<[]>(sql, [this._byUniqField.value]);
            if (rows.length === 1) this._id = rows[0].id;
            else throw new DocumentError(Types.DocumentErrorCode.sql_not_found, `There're ${rows.length} of records in '${this.dataSchema.tableName}'. Searched value '${this._byUniqField.value}' by field '${this._byUniqField.field}' Expected: 1`);
            //mconsole.sqld(`Found only id = '${this._id}' in ${this.dataSchema.tableName} by field '${this._byUniqField.field}' = '${this._byUniqField.value}' `);
        }
        while (true) {
            try {
                [rows, fields] = await this.sqlConnection.query<[]>(`select * from \`${this.dataSchema.tableName}\` where \`${this.dataSchema.idFieldName}\` = ?`, [this.id]);
                break;
            } catch (e: any) {
                if (e.code === 'ER_NO_SUCH_TABLE') {
                    await this.createMainTable();
                } else {
                    throw e;
                }
            }
        }
        if (rows.length === 1) {
            const parentObj = this.jsonTranslate(rows[0], this.dataSchema);
            if (this.dataSchema.related !== undefined) {
                for (const relObj of this.dataSchema.related) {
                    let [rows, fields]: [any[], FieldPacket[]] = [[], []];
                    while (true) {
                        try {
                            [rows, fields] = await this.sqlConnection.query<any[]>(`SELECT * FROM \`${this.dataSchema.relatedTablesPrefix + relObj.tableName}\` WHERE \`${this.dataSchema.relatedTablesPrefix + relObj.idFieldName}\` = ?`, [this.id]);

                            (parentObj as any)[relObj.tableName] = rows;
                            for (const row of rows) {
                                this.jsonTranslate(row, relObj);
                            }
                            break;
                        } catch (e: any) {
                            if (e.code === 'ER_NO_SUCH_TABLE') {
                                this.createRelatedTable(relObj);
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            }
            return parentObj;
        } else {
            throw new DocumentError(Types.DocumentErrorCode.sql_not_found, `Object '${this.constructor.name}' with id = '${this.id}' not found`);
        }
    }

    async wfNext(user: User): Promise<Types.WorkflowStatusCode>;
    async wfNext(user: User, newStatus: Types.WorkflowStatusCode): Promise<Types.WorkflowStatusCode>;
    async wfNext(user: User, predict: (availableStatuses: Types.WorkflowStatusCode[]) => Types.WorkflowStatusCode): Promise<Types.WorkflowStatusCode>;
    async wfNext(...arg: any[]): Promise<Types.WorkflowStatusCode> {
        const availableTransfers = this.wfSchema.transfers?.filter(transfer => transfer.from === this.data.wfStatus);
        let ret: Types.WorkflowStatusCode;
        switch (arg.length) {
            case 0:
                throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `First parameter must be Employee who has MDM role`);
            case 1:
                if (availableTransfers?.length === 1) {
                    ret = availableTransfers[0].to;
                    break;
                } else {
                    throw new DocumentError(
                        Types.DocumentErrorCode.wf_suspense,
                        `Couldn't process wfNext function because ambiguity in transfer table of '${this.constructor.name}' with id = '${this.id}'. Current wfStatus = '${this.data.wfStatus}'; availaible transfers are: ${availableTransfers}`
                    );
                }
            case 2:
                if (typeof arg[1] !== 'function') {
                    ret = arg[1];
                    const isNextWfStatusCorrectArr = availableTransfers?.filter(transfer => transfer.to === ret);
                    if (isNextWfStatusCorrectArr === undefined || isNextWfStatusCorrectArr.length === 0)
                        throw new DocumentError(
                            Types.DocumentErrorCode.wf_suspense,
                            `Couldn't process wfNext function because ambiguity in transfer table of '${this.constructor.name}' with id = '${this.id}'. Current wfStatus = '${this.data.wfStatus}'; availaible transfers are: ${JSON.stringify(availableTransfers)}; requested next status is: ${ret}`
                        );
                } else {
                    const predict = arg[1];
                    ret = predict(availableTransfers);
                }
                break;
            default:
                throw new DocumentError(
                    Types.DocumentErrorCode.wf_suspense,
                    `Couldn't process wfNext function because ambiguity in transfer table of '${this.constructor.name}' with id = '${this.id}'. Current wfStatus = '${this.data.wfStatus}'; availaible transfers are: ${availableTransfers}`
                );
        }
        this.data.wfStatus = ret;
        await this.save(arg[0].data.login);
        return ret;
    }

    async wfRelatedNext(relFieldName: string, arrIndex: number, user: User): Promise<Types.WorkflowStatusCode>;
    async wfRelatedNext(relFieldName: string, arrIndex: number, user: User, newStatus: Types.WorkflowStatusCode): Promise<Types.WorkflowStatusCode>;
    async wfRelatedNext(relFieldName: string, arrIndex: number, user: User, predict: (availableStatuses: Types.WorkflowStatusCode[]) => Types.WorkflowStatusCode): Promise<Types.WorkflowStatusCode>;
    async wfRelatedNext(...arg: any[]): Promise<Types.WorkflowStatusCode> {
        const relFieldName: string = arg[0];
        const arrIndex: number = arg[1];
        const availableTransfers = this.wfSchema.related
            ?.filter(relObj => relObj.tableName === arg[0])
            ?.at(0)
            ?.transfers?.filter(transfer => transfer.from === this.data.wfStatus);
        let ret: Types.WorkflowStatusCode;
        switch (arg.length) {
            case 0:
            case 1:
                throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `First parameter must be related table name (field name) and second one must be array index of related record`);
            case 2:
                throw new DocumentError(Types.DocumentErrorCode.parameter_expected, `Third parameter must be Employee (user) who has MDM role`);
            case 3:
                if (availableTransfers?.length === 1) {
                    ret = availableTransfers[0].to;
                    break;
                } else {
                    throw new DocumentError(
                        Types.DocumentErrorCode.wf_suspense,
                        `Couldn't process wfNext function because ambiguity in transfer table of '${this.constructor.name}' with id = '${this.id}'. Current wfStatus = '${this.data.wfStatus}'; availaible transfers are: ${availableTransfers}`
                    );
                }
            case 4:
                if (typeof arg[3] !== 'function') {
                    ret = arg[3];
                } else {
                    const predict = arg[3];
                    ret = predict(availableTransfers);
                }
                break;
            default:
                throw new DocumentError(
                    Types.DocumentErrorCode.wf_suspense,
                    `Couldn't process wfNext function because ambiguity in transfer table of '${this.constructor.name}' with id = '${this.id}'. Current wfStatus = '${this.data.wfStatus}'; availaible transfers are: ${availableTransfers}`
                );
        }
        (this.data as any)[relFieldName][arrIndex].wfStatus = ret;
        await this.save(arg[2].data.login);
        return ret;
    }

    async getCollection(whereTense: string, params: any[], orderTense: string, limit: number = 100): Promise<void> {
        const sql = `SELECT \`${this.dataSchema.idFieldName}\` FROM \`${this.dataSchema.tableName}\` WHERE (${whereTense}) AND \`blocked\` = 0 ORDER BY ${orderTense} LIMIT ${limit}`;
        //mconsole.sqlq(sql, params);
        while (true) {
            try {
                const [rows, fields] = await this.sqlConnection.query<[]>(sql, params);
                this._collection = rows;
                break;
            } catch (e: any) {
                if (e.code === 'ER_NO_SUCH_TABLE') {
                    await this.createMainTable();
                } else {
                    //await this.sqlConnection.rollback();
                    throw e;
                }
            }
        }
    }
    get collection() {
        if (this._collection === undefined) throw new DocumentError(Types.DocumentErrorCode.abstract_method, `getCollection MUST be called in await mode before this call`);
        return this._collection;
    }
}
