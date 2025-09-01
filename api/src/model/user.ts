import { Types} from '../types/common';
import { Document, DocumentError, IDocumentDataSchema, IDocumentWFSchema } from './protodocument';
import { IUser } from '../types/user';
import { createHmac } from 'crypto';

/**
 *
 */
interface IUserDataSchema extends IDocumentDataSchema {}
interface IUserWFSchema extends IDocumentWFSchema {}

export class User extends Document<IUser, IUserDataSchema, IUserWFSchema> {
    get dataSchema(): IUserDataSchema {
        return {
            idFieldName: 'id',
            tableName: 'users',
            relatedTablesPrefix: 'user_',
            fields: [
                { name: `login`, type: 'varchar(128)', required: true },
                { name: `email`, type: 'varchar(128)', required: true },
                { name: `phone`, type: 'varchar(128)', required: false },
                { name: `hash`, type: 'varchar(128)', required: true },
                { name: `name`, type: 'varchar(128)', required: true },
                { name: `photo`, type: 'json' },
                { name: `tguid`, type: 'varchar(128)' },
                { name: `settings`, type: 'json', required: true },
                { name: `signInAttemptsCount`, type: 'int', required: true, default: '0' }
            ],
            indexes: [{ fields: ['login'], indexType: 'UNIQUE' }],
        };
    }

    static calcHash(login: string, secretKey: string): string {
        const hash = createHmac('sha256', `${login} ${secretKey}`).digest('hex');
        return hash;
    }

    checkSecretKey(secretKey?: string): boolean {
        const hash = User.calcHash(this.data.login.toString(), secretKey === undefined ? '' : secretKey);
        return this.data.hash === hash;
    }

    get wfSchema(): IDocumentWFSchema {
        return {
            tableName: 'eatery',
            initialState: Types.WorkflowStatusCode.done,
        };
    }
}
