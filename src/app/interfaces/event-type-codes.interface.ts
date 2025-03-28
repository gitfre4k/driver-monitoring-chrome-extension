interface EventDetails {
  eventType: string;
  eventCode: number;
}

interface EventMap {
  ChangeToOffDutyStatus: EventDetails;
  ChangeToSleeperBerthStatus: EventDetails;
  ChangeToDrivingStatus: EventDetails;
  ChangeToOnDutyNotDrivingStatus: EventDetails;
  IntermediateLogConventionalLocationPrecision: EventDetails;
  IntermediateLogReducedLocationPrecision: EventDetails;
  DriversFirstCertification: EventDetails;
  DriversSecondCertification: EventDetails;
  DriversThirdCertification: EventDetails;
  DriversFourthCertification: EventDetails;
  DriversFifthCertification: EventDetails;
  DriversSixthCertification: EventDetails;
  DriversSeventhCertification: EventDetails;
  DriversEighthCertification: EventDetails;
  DriversNinthCertification: EventDetails;
  AuthenticatedDriverLogin: EventDetails;
  AuthenticatedDriverLogout: EventDetails;
  EnginePowerUpConventionalLocationPrecision: EventDetails;
  EnginePowerUpReducedLocationPrecision: EventDetails;
  EngineShutDownConventionalLocationPrecision: EventDetails;
  EngineShutDownReducedLocationPrecision: EventDetails;
  Remark: EventDetails;
  EldConnected: EventDetails;
  EldDisconnected: EventDetails;
  CoDriverAdd: EventDetails;
  CoDriverRemove: EventDetails;
  TrailerAttach: EventDetails;
  TrailerDetach: EventDetails;
  VehicleSelect: EventDetails;
  DriversDeCertificationOfRecords: EventDetails;
  VehicleStartOfDay: EventDetails;
  Dvir: EventDetails;
}

const eventTypes = {
  ChangeToOffDutyStatus: {
    eventType: 'ChangeInDriversDutyStatus',
    eventCode: 1,
  },
  ChangeToSleeperBerthStatus: {
    eventType: 'ChangeInDriversDutyStatus',
    eventCode: 2,
  },
  ChangeToDrivingStatus: {
    eventType: 'ChangeInDriversDutyStatus',
    eventCode: 3,
  },
  ChangeToOnDutyNotDrivingStatus: {
    eventType: 'ChangeInDriversDutyStatus',
    eventCode: 4,
  },
  IntermediateLogConventionalLocationPrecision: {
    eventType: 'IntermediateLog',
    eventCode: 1,
  },
  IntermediateLogReducedLocationPrecision: {
    eventType: 'IntermediateLog',
    eventCode: 2,
  },
  DriversFirstCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 1,
  },
  DriversSecondCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 2,
  },
  DriversThirdCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 3,
  },
  DriversFourthCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 4,
  },
  DriversFifthCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 5,
  },
  DriversSixthCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 6,
  },
  DriversSeventhCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 7,
  },
  DriversEighthCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 8,
  },
  DriversNinthCertification: {
    eventType: 'DriversCertificationOrRecertificationOfRecords',
    eventCode: 9,
  },
  AuthenticatedDriverLogin: {
    eventType: 'DriversLoginOrLogoutActivity',
    eventCode: 1,
  },
  AuthenticatedDriverLogout: {
    eventType: 'DriversLoginOrLogoutActivity',
    eventCode: 2,
  },
  EnginePowerUpConventionalLocationPrecision: {
    eventType: 'CmvEnginePowerUpOrShutDownActivity',
    eventCode: 1,
  },
  EnginePowerUpReducedLocationPrecision: {
    eventType: 'CmvEnginePowerUpOrShutDownActivity',
    eventCode: 2,
  },
  EngineShutDownConventionalLocationPrecision: {
    eventType: 'CmvEnginePowerUpOrShutDownActivity',
    eventCode: 3,
  },
  EngineShutDownReducedLocationPrecision: {
    eventType: 'CmvEnginePowerUpOrShutDownActivity',
    eventCode: 4,
  },
  Remark: {
    eventType: 'Custom',
    eventCode: 1,
  },
  EldConnected: {
    eventType: 'Custom',
    eventCode: 2,
  },
  EldDisconnected: {
    eventType: 'Custom',
    eventCode: 3,
  },
  CoDriverAdd: {
    eventType: 'Custom',
    eventCode: 4,
  },
  CoDriverRemove: {
    eventType: 'Custom',
    eventCode: 5,
  },
  TrailerAttach: {
    eventType: 'Custom',
    eventCode: 6,
  },
  TrailerDetach: {
    eventType: 'Custom',
    eventCode: 7,
  },
  VehicleSelect: {
    eventType: 'Custom',
    eventCode: 8,
  },
  DriversDeCertificationOfRecords: {
    eventType: 'Custom',
    eventCode: 9,
  },
  VehicleStartOfDay: {
    eventType: 'Custom',
    eventCode: 10,
  },
  Dvir: {
    eventType: 'Custom',
    eventCode: 11,
  },
};
