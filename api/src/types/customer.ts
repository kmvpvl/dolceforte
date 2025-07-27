export enum CustomerType {
    person,
    legal
}
export interface ICustomer {
    type: CustomerType;
    VATPayer: boolean;
    name: string;
}