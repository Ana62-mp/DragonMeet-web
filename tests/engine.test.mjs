import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/engine.ts';
const course = (user, day, start, end) => ({id:`${user}-${day}-${start}`,user,day,start,end,title:'Demo',code:'TST',building:'Newton',room:'101'});
const at = (blocks, day, hour) => blocks.find(b => b.day === day && b.start <= hour && b.end > hour);

test('two students: complete match and no partial status', () => {
 const blocks=calculate([course('a',0,9,10),course('b',0,9,10)],['a','b']);
 assert.equal(at(blocks,0,8).status,'all');
 assert.equal(at(blocks,0,9.25).status,'none');
 assert.equal(blocks.some(b=>b.status==='partial'),false);
});
test('five students: full, partial and none are correctly classified', () => {
 const students=['a','b','c','d','e'];
 const entries=[...students.map(id=>course(id,0,7,8)),...students.slice(0,2).map(id=>course(id,0,9,10))];
 const blocks=calculate(entries,students);
 assert.equal(at(blocks,0,7.25).status,'none');
 assert.equal(at(blocks,0,9.25).status,'partial');
 assert.deepEqual(at(blocks,0,9.25).free,['c','d','e']);
 assert.equal(at(blocks,0,12).status,'all');
});
test('adjacent classes do not overlap at endpoint', () => {
 const blocks=calculate([course('a',0,8,9)],['a','b']);
 assert.equal(at(blocks,0,8.75).status,'none');
 assert.equal(at(blocks,0,9).status,'all');
});
test('consecutive equivalent quarters merge into a longer block', () => {
 const blocks=calculate([],['a','b']);
 assert.equal(blocks.length,5);
 assert.equal(blocks[0].start,7);
 assert.equal(blocks[0].end,20);
});
test('invalid participant sizes are rejected', () => {
 assert.deepEqual(calculate([],[]),[]);
 assert.deepEqual(calculate([],['a','b','c','d','e','f']),[]);
});
