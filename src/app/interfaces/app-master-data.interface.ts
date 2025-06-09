interface CapabilityResource {
  name: string;
  allowedOperations: string[];
  allowsAll: boolean;
}

interface Capability {
  resources: CapabilityResource[];
}

interface AblyTokenRequest {
  keyName: string;
  ttl: string;
  capability: Capability;
  mac: string;
  nonce: string;
  timestamp: string;
}

interface Company {
  id: number;
  name: string;
}

interface State {
  stateCode: string;
  id: number;
  name: string;
}

interface Country {
  states: State[];
}

interface CurrentCompanyTimeZone {
  ianaTimeZone: string;
  utcOffset: number;
}

interface EventTypeCodeDetail {
  eventType: string;
  eventCode: number;
}

interface EventTypeCodes {
  [key: string]: EventTypeCodeDetail;
}

interface UserPermissions {
  entityDisplayName: string;
  [key: string]: any;
}

export interface IAppMasterData {
  ablyChannelPrefix: string;
  ablyTokenRequest: AblyTokenRequest;
  companies: Company[];
  countries: Country[];
  currentCompanyTimeZone: CurrentCompanyTimeZone;
  eldProvider: string;
  eventTypeCodes: EventTypeCodes;
  masterAdminExclusivePermissions: string[];
  userPermissions: UserPermissions;
}
