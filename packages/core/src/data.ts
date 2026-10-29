import fuelPricesJson from '../../../data/fuel-prices.json';
import licenceFeesJson from '../../../data/licence-fees.json';
import { fuelPricesSchema, licenceFeesSchema } from './reference-data';

/** Reference data from `data/`, validated at load time. Check `verified` before trusting figures. */
export const fuelPrices = fuelPricesSchema.parse(fuelPricesJson);
export const licenceFees = licenceFeesSchema.parse(licenceFeesJson);
