/**
 * location-actions — barrel re-export (see ./location-actions/ with "use server").
 */

export {
  getLocationById,
  getLocationDetailsForAI,
  getNPCsByLocation,
  updateNPCCurrentLocation,
  getLocationStats,
  getAllLocations,
  getAllLocationsByWorld
} from "./location-actions/part-01";
export {
  createLocationQuick
} from "./location-actions/part-02";
