// Fill only missing sample answers on the app's known fictional demo fixture.
// Never resets cards, changes stages, or overwrites an existing answer.
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL??'');
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local database required');
const db=new pg.Client({connectionString:url.href});
try{
 await db.connect();
 const result=await db.query(`INSERT INTO "TeamGuess" ("id","teamId","wineId","category","choiceId")
 SELECT 'demo_' || md5(t.id || w.id || c.category),t.id,w.id,c.category::"QuizCategory",
 CASE WHEN (t.name='Foxes' AND NOT (w.position='B' AND c.category='PRICE')) OR (t.name<>'Foxes' AND c.category IN ('PRICE','NOTE')) THEN w.id ELSE other.id END
 FROM "Event" e JOIN "Team" t ON t."eventId"=e.id JOIN "Wine" w ON w."eventId"=e.id
 JOIN "Wine" other ON other."eventId"=e.id AND other.id<>w.id
 CROSS JOIN (VALUES ('PRICE'),('ORIGIN'),('NOTE'),('GRAPE')) AS c(category)
 WHERE e."idSet"='colours' AND e."wineCount"=2
 AND (SELECT count(*) FROM "Wine" exact WHERE exact."eventId"=e.id)=2
 AND w.name IN ('Practice white — fictional','Practice red — fictional') AND other.name IN ('Practice white — fictional','Practice red — fictional')
 ON CONFLICT ("teamId","wineId","category") DO NOTHING`);
 console.log(JSON.stringify({missingDemoAnswersFilled:result.rowCount,existingAnswersPreserved:true}));
}finally{await db.end();}
