import { IParsedErrorInfo } from '../interfaces/api.interface';
import { TErrorParsedComparison } from '../types';

export const parseErrorMessage = (message: string): IParsedErrorInfo | null => {
  const regex =
    /mileage difference of (\d+) miles, indicating that the distance from Google Maps is (smaller|greater)/;
  const matchResult = message.match(regex);

  if (!matchResult) {
    return null;
  }

  const miles = parseInt(matchResult[1], 10);
  const comparison = matchResult[2] as TErrorParsedComparison;

  return { miles, comparison };
};
