import axios from './axios';

// Cihazlar
export const listSnmpDevicesApi = () => axios.get('/snmp/devices');
export const getSnmpDeviceApi = (id: number) => axios.get(`/snmp/devices/${id}`);
export const createSnmpDeviceApi = (data: any) => axios.post('/snmp/devices', data);
export const updateSnmpDeviceApi = (id: number, data: any) => axios.put(`/snmp/devices/${id}`, data);
export const deleteSnmpDeviceApi = (id: number) => axios.delete(`/snmp/devices/${id}`);

// OID Mappings
export const getOidMappingsApi = (deviceId: number) => axios.get(`/snmp/devices/${deviceId}/oids`);

// Readings
export const getLatestReadingsApi = (deviceId: number) => axios.get(`/snmp/devices/${deviceId}/readings`);
export const getReadingHistoryApi = (deviceId: number, oidId: number, hours?: number) =>
  axios.get(`/snmp/devices/${deviceId}/readings/${oidId}/history`, { params: { hours } });

// Live dashboard
export const getSnmpLiveApi = () => axios.get('/snmp/live');

// Alarmlar
export const getSnmpAlarmsApi = (all?: boolean) => axios.get('/snmp/alarms', { params: { all } });
export const acknowledgeAlarmApi = (id: number) => axios.post(`/snmp/alarms/${id}/acknowledge`);

// Polling
export const startPollingApi = () => axios.post('/snmp/polling/start');
export const stopPollingApi = () => axios.post('/snmp/polling/stop');
