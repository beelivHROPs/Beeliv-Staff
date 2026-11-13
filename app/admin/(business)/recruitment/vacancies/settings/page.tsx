import {VacancySettings} from '@/components/admin/vacancies/VacancySettings';
export default function VacancySettingsPage(){
 if(process.env.NEXT_PUBLIC_VACANCIES_BACKEND_ENABLED!=='true')return <p>Live vacancy settings are not available yet.</p>;
 return <VacancySettings/>;
}
