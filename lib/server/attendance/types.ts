/** Server-owned portal selects the authority boundary; never accept it from JSON. */
export type AttendancePortal='staff'|'admin'|'client';
export type AttendanceAction='list'|'check-in'|'check-out'|'correct';
export type AttendanceCode='unavailable'|'unauthenticated'|'forbidden'|'invalid_request'|'rate_limited'|'not_found'|'conflict'|'stale'|'outcome_unknown';
export type AttendanceIdentity={uid:string;sessionId:string;emailVerified:boolean;active:boolean;aal:string;staff:boolean};
export type AttendanceRow={attendanceId:string;shiftId:string;revision:number;workDate:string;name:string;clientId:string;clientName:string;outletId:string;outletName:string;role:string;plannedStart:string;plannedEnd:string;checkedInAt:string|null;checkedOutAt:string|null;corrected:boolean};
export type AttendancePage={items:AttendanceRow[];next:{workDate:string;attendanceId:string}|null};
export type AttendanceCommand={requestId:string;shiftId:string}|{requestId:string;attendanceId:string;expectedRevision:number;checkedInAt:string;checkedOutAt:string|null;reason:string};
export type AttendanceFailure={ok:false;code:AttendanceCode;requestId?:string};
export type AttendanceResult={ok:true;page:AttendancePage}|{ok:true;record:AttendanceRow;replayed:boolean}|AttendanceFailure;
export type AttendanceDependencies={enabled:boolean;writesEnabled:boolean;portal:AttendancePortal;verifyIdentity():Promise<AttendanceIdentity|null>;consumeLimit(uid:string,write:boolean):Promise<void>;fingerprint(action:AttendanceAction,command:unknown):string;rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
