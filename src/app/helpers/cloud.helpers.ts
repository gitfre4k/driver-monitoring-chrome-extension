import {
  IData,
  IDataDriver,
  IDataDriverNotes,
} from '../interfaces/cloud.interface';

export const sortData = (data: IData | undefined) => {
  const sortedData: [
    key: string,
    data: {
      name: string;
      drivers: IDataDriver;
      companyNotes: IDataDriverNotes;
    },
  ][] = [];
  if (data) {
    for (let key in data) {
      sortedData.push([key, data[key]]);
    }

    sortedData.sort((a, b) => a[1].name.localeCompare(b[1].name));
  }
  return sortedData;
};

export const isEmpty = (obj: any): boolean => {
  return Object.keys(obj).length === 0;
};

export const resultCount = (result: {
  name: string;
  drivers: IDataDriver;
  companyNotes: IDataDriverNotes;
}) => {
  let count = 0;
  for (let note in result.companyNotes) count++;
  for (let driver in result.drivers) {
    for (let note in result.drivers[driver].notes) {
      count++;
    }
  }
  return count;
};
