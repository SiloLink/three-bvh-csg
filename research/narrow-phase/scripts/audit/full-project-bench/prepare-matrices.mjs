import fs from 'node:fs';
import {readModelCatalog} from '../root/variants/baseline/backend/src/core/model/model-catalog.js';
import {normalizeMatrixRequest} from '../root/variants/baseline/backend/src/cloud/validation.js';
import {buildUiParityMatrix} from '../../../clash-robustness-sweep/src/matrix.js';
for(const name of process.argv.slice(2)) {
 const dir=new URL(`./${name}/`,import.meta.url),project=JSON.parse(fs.readFileSync(new URL('project.json',dir)));
 const catalogs=[];
 for(const m of project.models){const c=await readModelCatalog(m);catalogs.push({...c,modelGuid:m.modelId});}
 const uiMatrix=buildUiParityMatrix({disciplines:catalogs});
 const matrix=normalizeMatrixRequest(uiMatrix);
 fs.writeFileSync(new URL('catalogs.json',dir),JSON.stringify(catalogs,null,2));
 fs.writeFileSync(new URL('ui-matrix.json',dir),JSON.stringify(uiMatrix,null,2));
 fs.writeFileSync(new URL('matrix.json',dir),JSON.stringify(matrix,null,2));
 console.log(JSON.stringify({name,typedObjectCount:catalogs.reduce((s,c)=>s+c.typedObjectCount,0),axes:uiMatrix.axes.length,rules:matrix.enabledPairs.length}));
}
