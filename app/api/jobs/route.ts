import {handlePublicJobs} from '@/lib/server/public-jobs/handler';
import {publicJobsEnabled,publicJobsGateway} from '@/lib/server/public-jobs/runtime';
export const runtime='nodejs';
export async function GET(request:Request){return handlePublicJobs(request,publicJobsEnabled(),publicJobsGateway);}
