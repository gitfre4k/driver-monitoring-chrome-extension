import { ILog } from '.';

export interface IScripts {
  id: number;
  name: string;
  content: string;
}

export interface ITenantsLog {
  [tenantId: string]: ILog;
}
