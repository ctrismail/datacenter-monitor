import axios from './axios';

// Cihazlar
export const listSnmpDevicesApi = () => axios.get('/api/snmp/devices');
export const getSnmpDeviceApi = (id: number) => axios.get(`/api/snmp/devices/${id}`);
export const createSnmpDeviceApi = (data: any) => axios.post('/api/snmp/devices', data);
export const updateSnmpDeviceApi = (id: number, data: any) => axios.put(`/api/snmp/devices/${id}`, data);
export const deleteSnmpDeviceApi = (id: number) => axios.delete(`/api/snmp/devices/${id}`);

// OID Mappings
export const getOidMappingsApi = (deviceId: number) => axios.get(`/api/snmp/devices/${deviceId}/oids`);

// Readings
export const getLatestReadingsApi = (deviceId: number) => axios.get(`/api/snmp/devices/${deviceId}/readings`);
export const getReadingHistoryApi = (deviceId: number, oidId: number, hours?: number) =>
  axios.get(`/api/snmp/devices/${deviceId}/readings/${oidId}/history`, { params: { hours } });

// Live dashboard
export const getSnmpLiveApi = () => axios.get('/api/snmp/live');

// Alarmlar
export const getSnmpAlarmsApi = (all?: boolean) => axios.get('/api/snmp/alarms', { params: { all } });
export const acknowledgeAlarmApi = (id: number) => axios.post(`/api/snmp/alarms/${id}/acknowledge`);

// Polling
export const startPollingApi = () => axios.post('/api/snmp/polling/start');
export const stopPollingApi = () => axios.post('/api/snmp/polling/stop');
