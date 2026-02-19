// Stub all firebase/* imports for unit tests
export const getFirestore = () => ({});
export const getDatabase = () => ({});
export const getAuth = () => ({});
export const getApp = () => ({});
export const initializeApp = () => ({});
export const collection = () => ({});
export const doc = () => ({});
export const query = () => ({});
export const where = () => ({});
export const onSnapshot = () => () => {};
export const setDoc = async () => {};
export const deleteDoc = async () => {};
export const Timestamp = { now: () => ({ toMillis: () => Date.now() }) };
