const path=require('path');
const root=path.resolve(__dirname,'..');
const req=require('module').createRequire(root+'/package.json');
process.env.DATABASE_URL='postgres://test:test@127.0.0.1:5432/test';
process.env.DB_SSL='false';
req('tsx/cjs');
const {Participant,ParticipantSchedule}=req('./src/models/index.ts');
const {sequelize}=req('./src/lib/sequelize.ts');
const {fn,col}=req('sequelize');
let sql='';
sequelize.query=async text=>{sql=text;return [{scheduleId:'00000000-0000-4000-a000-000000000001',count:2}];};
(async()=>{
await ParticipantSchedule.findAll({
 include:[{model:Participant,required:true,attributes:[]}],
 attributes:[['schedule_id','scheduleId'],[fn('COUNT',fn('DISTINCT',col('participant_id'))),'count']],
 where:{scheduleId:['00000000-0000-4000-a000-000000000001']},
 group:['schedule_id'],raw:true
});
require('assert').match(sql,/INNER JOIN "participants"/);
require('assert').match(sql,/"deleted_at" IS NULL/);
console.log('Consulta real de Sequelize validada: asociación, JOIN y exclusión de participantes eliminados. Sin conectar a una base.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
