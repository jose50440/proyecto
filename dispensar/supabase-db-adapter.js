/**
 * Adaptador Supabase que emula la API de Firestore para IHSS.
 * Uso: window.createSupabaseAdapter(supabaseClient)
 * Devuelve objeto db con collection().add/doc/get/where/orderBy/limit/onSnapshot y batch().
 */
(function () {
    var SERVER_TS = { __supabaseServerTs: true };
    var DOC_ID_FIELD = '__documentId__';

    function replaceTimestamp(obj) {
        if (obj && typeof obj === 'object' && obj.__supabaseServerTs) return new Date().toISOString();
        if (Array.isArray(obj)) return obj.map(replaceTimestamp);
        if (obj !== null && typeof obj === 'object') {
            var out = {};
            for (var k in obj) out[k] = replaceTimestamp(obj[k]);
            return out;
        }
        return obj;
    }

    function rowToDoc(table, row) {
        if (!row) return null;
        var id = row.id;
        if (table === 'prod_kits') {
            var payload = row.payload || {};
            return { id: id, patientId: row.patientId, ...payload };
        }
        if (table === 'prod_templates') {
            var p = row.payload || {};
            return { id: id, ...p, createdAt: row.createdAt, updatedAt: row.updatedAt };
        }
        if (table === 'prod_templates_ruta') {
            var p2 = row.payload || {};
            return { id: id, ...p2, savedAt: row.savedAt };
        }
        return { id: id, ...row };
    }

    function rowToSnap(table, row) {
        var data = rowToDoc(table, row);
        if (!data) return null;
        return { id: data.id, exists: true, data: function () { return data; } };
    }

    function createSupabaseAdapter(supabase) {
        var tableName = function (name) { return name; };

        function collection(name) {
            var table = tableName(name);
            var _where = null, _orderBy = [], _limit = null, _startAfter = null, _startAt = null, _endAt = null;

            var chain = {
                doc: function (id) {
                    var ref = { _collection: name, _id: id === undefined ? null : id };
                    return {
                        _collection: name,
                        _id: ref._id,
                        get: async function () {
                            try {
                                var col = name;
                                if (col === 'prod_kits') {
                                    var r = await supabase.from(table).select('*').eq('id', id).maybeSingle();
                                    if (r.error) throw { code: r.error.code || 'unknown', message: r.error.message };
                                    var row = r.data;
                                    if (!row) return { exists: false, id: id, data: function () { return {}; } };
                                    return { exists: true, id: row.id, data: function () { return rowToDoc(table, row); } };
                                }
                                if (col === 'prod_templates_ruta') {
                                    var r2 = await supabase.from(table).select('*').eq('id', id).maybeSingle();
                                    if (r2.error) throw { code: r2.error.code, message: r2.error.message };
                                    var row2 = r2.data;
                                    if (!row2) return { exists: false, id: id, data: function () { return {}; } };
                                    return { exists: true, id: row2.id, data: function () { return { ...row2.payload, savedAt: row2.savedAt }; } };
                                }
                                var docId = id || ref._id;
                                if (!docId) return { exists: false, id: null, data: function () { return {}; } };
                                var res = await supabase.from(table).select('*').eq('id', docId).maybeSingle();
                                if (res.error) throw { code: res.error.code, message: res.error.message };
                                if (!res.data) return { exists: false, id: docId, data: function () { return {}; } };
                                return rowToSnap(table, res.data);
                            } catch (e) {
                                throw e;
                            }
                        },
                        update: async function (data) {
                            data = replaceTimestamp(data);
                            var docId = id || ref._id;
                            if (!docId) return;
                            if (table === 'prod_kits') {
                                var existing = await supabase.from(table).select('*').eq('id', docId).maybeSingle();
                                if (existing.error) throw { code: existing.error.code, message: existing.error.message };
                                var row = existing.data;
                                var currentPayload = (row && row.payload) ? (typeof row.payload === 'object' ? { ...row.payload } : {}) : {};
                                var payload = {};
                                var keysToDelete = [];
                                for (var k in data) {
                                    if (k !== 'patientId' && k !== 'id') {
                                        var val = data[k];
                                        if (val && typeof val === 'object' && val.__supabaseDelete) {
                                            keysToDelete.push(k);
                                            delete currentPayload[k];
                                        } else if (val !== undefined && !(k === 'fechaEntregaKit' && (val === '' || val === null))) {
                                            payload[k] = val;
                                        } else if (k === 'fechaEntregaKit' && (val === '' || val === null)) {
                                            keysToDelete.push(k);
                                            delete currentPayload[k];
                                        }
                                    }
                                }
                                var mergedPayload = Object.assign({}, currentPayload, payload);
                                keysToDelete.forEach(function(key) { delete mergedPayload[key]; });
                                var updateObj = { payload: mergedPayload };
                                if (data.patientId !== undefined) updateObj.patientId = data.patientId;
                                var r = await supabase.from(table).update(updateObj).eq('id', docId);
                                if (r.error) throw { code: r.error.code, message: r.error.message };
                                return;
                            }
                            if (table === 'prod_templates_ruta') {
                                var r2 = await supabase.from(table).update({ payload: data, savedAt: new Date().toISOString() }).eq('id', docId);
                                if (r2.error) throw { code: r2.error.code, message: r2.error.message };
                                return;
                            }
                            var res = await supabase.from(table).update(data).eq('id', docId);
                            if (res.error) throw { code: res.error.code, message: res.error.message };
                        },
                        set: async function (data) {
                            data = replaceTimestamp(data);
                            var docId = id || ref._id;
                            if (table === 'prod_kits') {
                                var patientId = data.patientId;
                                var payload = {};
                                for (var k in data) if (k !== 'patientId' && k !== 'id') payload[k] = data[k];
                                var r = await supabase.from(table).upsert({ id: docId, patientId: patientId, payload: payload }, { onConflict: 'id' });
                                if (r.error) throw { code: r.error.code, message: r.error.message };
                                return;
                            }
                            if (table === 'prod_templates_ruta') {
                                var r2 = await supabase.from(table).upsert({ id: docId, payload: data, savedAt: new Date().toISOString() }, { onConflict: 'id' });
                                if (r2.error) throw { code: r2.error.code, message: r2.error.message };
                                return;
                            }
                            var docId2 = docId || id;
                            var res = await supabase.from(table).upsert({ id: docId2, ...data }, { onConflict: 'id' });
                            if (res.error) throw { code: res.error.code, message: res.error.message };
                        },
                        delete: async function () {
                            var docId3 = id || ref._id;
                            if (!docId3) return;
                            var res = await supabase.from(table).delete().eq('id', docId3);
                            if (res.error) throw { code: res.error.code, message: res.error.message };
                        },
                        onSnapshot: function (callback) {
                            var last = null;
                            var tick = function () {
                                chain.get().then(function (snap) {
                                    var docs = snap.docs || [];
                                    var json = JSON.stringify(docs.map(function (d) { return d.id + (d.data ? d.data() : {}); }));
                                    if (last !== json) { last = json; callback({ docs: docs }); }
                                }).catch(function () {});
                            };
                            tick();
                            var iv = setInterval(tick, 3000);
                            return function () { clearInterval(iv); };
                        }
                    };
                },
                add: async function (data) {
                    data = replaceTimestamp(data);
                    if (table === 'prod_kits') {
                        var patientId = data.patientId;
                        var payload = {};
                        for (var k in data) if (k !== 'patientId' && k !== 'id') payload[k] = data[k];
                        var r = await supabase.from(table).insert({ patientId: patientId, payload: payload }).select('id').single();
                        if (r.error) throw { code: r.error.code, message: r.error.message };
                        return { id: r.data.id };
                    }
                    if (table === 'prod_patient_reports') {
                        var row = { type: data.type, added: data.added || null, addedCount: data.addedCount || 0, updatedCount: data.updatedCount || 0, by: data.by || null, patientId: data.patientId || null, dni: data.dni || null, nombre: data.nombre || null, telefono: data.telefono || null, direccion: data.direccion || null, descripcionMunicipio: data.descripcionMunicipio || null, tipoAfiliado: data.tipoAfiliado || null };
                        var r2 = await supabase.from(table).insert(row).select('id').single();
                        if (r2.error) throw { code: r2.error.code, message: r2.error.message };
                        return { id: r2.data.id };
                    }
                    var res = await supabase.from(table).insert(data).select('id').single();
                    if (res.error) throw { code: res.error.code, message: res.error.message };
                    return { id: res.data.id };
                },
                where: function (field, op, value) {
                    _where = { field: field, op: op, value: value };
                    return chain;
                },
                orderBy: function (field, dir) {
                    _orderBy.push({ field: field === DOC_ID_FIELD ? 'id' : field, dir: dir || 'asc' });
                    return chain;
                },
                limit: function (n) {
                    _limit = n;
                    return chain;
                },
                startAfter: function (a, b) {
                    _startAfter = [a, b];
                    return chain;
                },
                startAt: function (v) {
                    _startAt = v;
                    return chain;
                },
                endAt: function (v) {
                    _endAt = v;
                    return chain;
                },
                get: async function () {
                    var q = supabase.from(table).select('*');
                    if (_where) {
                        if (_where.op === '==') q = q.eq(_where.field, _where.value);
                    }
                    if (_orderBy.length) {
                        var ob = _orderBy[0];
                        q = q.order(ob.field, { ascending: ob.dir !== 'desc' });
                        for (var i = 1; i < _orderBy.length; i++) {
                            var o = _orderBy[i];
                            q = q.order(o.field, { ascending: o.dir !== 'desc' });
                        }
                    }
                    if (_startAt != null) q = q.gte(_orderBy[0] ? _orderBy[0].field : 'id', _startAt);
                    if (_endAt != null) q = q.lte(_orderBy[0] ? _orderBy[0].field : 'id', _endAt);
                    if (_startAfter && _startAfter.length >= 1) {
                        var f2 = (_orderBy[0] && _orderBy[0].field) || 'id';
                        var cursorVal = _startAfter[0];
                        var cursorId = _startAfter[1];
                        if (cursorId != null && f2 !== 'id') {
                            q = q.gte(f2, cursorVal).order(f2, { ascending: true }).order('id', { ascending: true });
                            if (_limit != null) q = q.limit(_limit * 3);
                        } else {
                            q = q.gt(f2, cursorVal);
                        }
                    }
                    if (_limit != null && !(_startAfter && _startAfter.length >= 2)) q = q.limit(_limit);
                    var r = await q;
                    if (r.error) throw { code: r.error.code, message: r.error.message };
                    var rows = r.data || [];
                    if (_startAfter && _startAfter.length >= 2) {
                        var cv = _startAfter[0], cid = _startAfter[1];
                        var f3 = (_orderBy[0] && _orderBy[0].field) || 'id';
                        rows = rows.filter(function (row) {
                            var v = row[f3];
                            var id = row.id;
                            if (v > cv) return true;
                            if (v === cv && id > cid) return true;
                            return false;
                        });
                        if (_limit != null) rows = rows.slice(0, _limit);
                    }
                    var docs = rows.map(function (row) {
                        var d = rowToDoc(table, row);
                        var ref = { _collection: table, _id: row.id };
                        return { id: row.id, ref: ref, data: function () { return d; } };
                    });
                    return { docs: docs, empty: docs.length === 0 };
                },
                onSnapshot: function (callback) {
                    var last = null;
                    function tick() {
                        chain.get().then(function (snap) {
                            var docs = snap.docs || [];
                            var json = JSON.stringify(docs.map(function (d) {
                                var data = d.data ? d.data() : {};
                                return d.id + ':' + JSON.stringify(data);
                            }));
                            if (last !== json) { last = json; callback(snap); }
                        }).catch(function () {});
                    }
                    tick();
                    var iv = setInterval(tick, 1000);
                    return function () { clearInterval(iv); };
                }
            };
            return chain;
        }

        function batch() {
            var ops = [];
            return {
                update: function (ref, data) {
                    ops.push({ type: 'update', table: ref._collection, id: ref._id, data: replaceTimestamp(data) });
                },
                set: function (ref, data) {
                    ops.push({ type: 'set', table: ref._collection, id: ref._id, data: replaceTimestamp(data) });
                },
                commit: async function () {
                    for (var i = 0; i < ops.length; i++) {
                        var op = ops[i];
                        var t = op.table;
                        if (op.type === 'update') {
                            await supabase.from(t).update(op.data).eq('id', op.id);
                        } else {
                            if (op.id == null) {
                                await supabase.from(t).insert(op.data).select('id').single();
                            } else {
                                await supabase.from(t).upsert({ id: op.id, ...op.data }, { onConflict: 'id' });
                            }
                        }
                    }
                }
            };
        }

        return {
            collection: function (name) {
                var c = collection(name);
                c.doc = function (id) {
                    var ref = { _collection: name, _id: id };
                    var docChain = collection(name).doc(id);
                    docChain.ref = ref;
                    return docChain;
                };
                return c;
            },
            batch: batch
        };
    }

    window.createSupabaseAdapter = createSupabaseAdapter;
    window.SUPABASE_SERVER_TS = SERVER_TS;
    window.SUPABASE_DOCUMENT_ID = DOC_ID_FIELD;
})();
