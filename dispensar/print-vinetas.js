/**
 * Viñetas de impresión compartidas: misma plantilla y lógica que Operaciones (index).
 * Uso: window.PrintVinetas.printRuta(kit, patient, options), .printVentanilla(...), .printRefrigerado(...)
 * options: { db, firebaseInitialized, users, contacts, currentUser }
 */
(function () {
    'use strict';
    var sep = ' ----- ';
    function _vEsc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function _vPw(html, css, title) {
        var iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
        document.body.appendChild(iframe);
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + _vEsc(title) + '</title><style>' + css + '</style></head><body>' + html + '</body></html>');
        doc.close();
        var hasPrinted = false;
        function doPrint() {
            if (hasPrinted || !iframe.parentNode) return;
            hasPrinted = true;
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(function () {
                if (iframe.parentNode) document.body.removeChild(iframe);
            }, 2000);
        }
        iframe.onload = function () { setTimeout(doPrint, 300); };
        setTimeout(doPrint, 800);
    }
    function getGpsEnabled(kitData) {
        if (!kitData) return false;
        if (kitData.gpsEnabled === true || kitData.gpsEnabled === 'true' || kitData.gpsEnabled === 1) return true;
        if (kitData.gpsStatus === 'TIENE GPS') return true;
        var gpsStr = String(kitData.gpsEnabled || kitData.tieneGps || '').toUpperCase();
        return gpsStr === 'SI' || gpsStr === 'SÍ' || gpsStr === 'TRUE' || gpsStr === '1';
    }
    function resolveDeliveryAddressRuta(kitData) {
        return String(kitData && kitData.direccionEntrega ? kitData.direccionEntrega : '').trim();
    }
    function _vFormatCC(agenteName, userList, contactList) {
        var name = (agenteName || '').trim();
        if (!name) return '—';
        var ulist = userList || [];
        var u = ulist.find(function (x) {
            var n = (x.nombre || x.username || x.name || '').trim().toLowerCase();
            return n && n === name.toLowerCase();
        });
        if (u) {
            var tel = (u.telefono || u.phone || u.movil || u.tel || '').toString().trim();
            return tel ? (u.nombre || u.username || u.name || name) + sep + tel : (u.nombre || u.username || u.name || name);
        }
        var clist = contactList || [];
        var c = clist.find(function (x) { return (x.name || '').trim().toLowerCase() === name.toLowerCase(); });
        if (c && (c.phone || '').toString().trim()) return (c.name || name) + sep + (c.phone || '').toString().trim();
        return name;
    }
    function _vNormalizeCC(raw) {
        if (!raw || !String(raw).trim()) return '';
        var s = String(raw).trim();
        if (s.indexOf(' --- ') !== -1) { var p = s.split(' --- '); return (p[0] || '').trim() + sep + (p[1] || '').trim(); }
        if (s.indexOf(sep) !== -1) return s;
        if (s.indexOf('---') !== -1) { var p2 = s.split('---'); return (p2[0] || '').trim() + sep + (p2[1] || '').trim(); }
        return '';
    }
    function _vFetchAgentFromFirebase(agenteName, db) {
        var name = (agenteName || '').trim();
        if (!name || !db) return Promise.resolve(null);
        return db.collection('prod_users').get().then(function (snap) {
            var nameLower = name.toLowerCase();
            var docs = snap.docs || (snap.empty ? [] : [snap]);
            for (var i = 0; i < docs.length; i++) {
                var d = docs[i].data ? docs[i].data() : docs[i];
                var n = (d.nombre || d.username || d.name || '').trim().toLowerCase();
                if (n && n === nameLower) {
                    var tel = (d.telefono || d.phone || d.movil || d.tel || '').toString().trim();
                    var displayName = (d.nombre || d.username || d.name || name).trim();
                    return tel ? displayName + sep + tel : displayName;
                }
            }
            return null;
        }).catch(function () { return null; });
    }
    function resolveRutaPlaceholders(kitData, patientData, users, contacts, db) {
        var gpsEnabled = getGpsEnabled(kitData);
        var direccionEntrega = resolveDeliveryAddressRuta(kitData);
        var telPersonal = String(patientData && patientData.telefono ? patientData.telefono : '').trim();
        var telFamiliar = String(patientData && patientData.telefonoFamiliar ? patientData.telefonoFamiliar : '').trim();
        var phoneHighlight = String(kitData && kitData.phoneHighlight ? kitData.phoneHighlight : '').trim().toLowerCase();
        var telPersonalDisplay = telPersonal;
        var telFamiliarDisplay = telFamiliar;
        if (phoneHighlight === 'personal' && telPersonal) telPersonalDisplay = '---> ' + telPersonal;
        else if (phoneHighlight === 'familiar' && telFamiliar) telFamiliarDisplay = telFamiliar + ' <---';
        var telefonosText = [telPersonalDisplay, telFamiliarDisplay].filter(Boolean).join(' / ');
        var ccRaw = (kitData.contactCenter || (patientData && patientData.contactCenter) || '').toString().trim();
        var ccNormalized = _vNormalizeCC(ccRaw);
        var agenteName = (patientData && patientData.agenteContactCenter) || kitData.agenteContactCenter || (ccRaw && ccRaw.indexOf(' --- ') === -1 && ccRaw.indexOf(' ----- ') === -1 ? ccRaw : '';
        agenteName = String(agenteName || '').trim();
        var contactCenterDisplay = ccNormalized;
        if (!contactCenterDisplay && agenteName) {
            return _vFetchAgentFromFirebase(agenteName, db).then(function (fromDb) {
                contactCenterDisplay = fromDb || _vFormatCC(agenteName, users || [], contacts || []);
                if (!contactCenterDisplay || contactCenterDisplay === '—') contactCenterDisplay = agenteName || '—';
                if (contactCenterDisplay && contactCenterDisplay.indexOf(sep) === -1) contactCenterDisplay = contactCenterDisplay + sep;
                var ccParts = (contactCenterDisplay || '').split(sep);
                var contactCenterName = (ccParts[0] || '').trim();
                var contactCenterPhone = (ccParts[1] || '').trim();
                var fechaEntrega = '';
                if (kitData.fechaEntregaKit) {
                    var date = new Date(kitData.fechaEntregaKit);
                    if (!isNaN(date.getTime())) fechaEntrega = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } else if (kitData.fechaArmado) {
                    var date2 = new Date(kitData.fechaArmado);
                    if (!isNaN(date2.getTime())) fechaEntrega = date2.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
                var medicamentos = kitData.medicamentos || [];
                var totalMeds = medicamentos.length;
                var dispensadosMeds = medicamentos.filter(function (m) { return m.dispensar !== false; }).length;
                var cantidadMeds = totalMeds > 0 ? dispensadosMeds + '/' + totalMeds : '0/0';
                var observacionesEntrega = (kitData.observacionesEntrega || kitData.observations || kitData.obsRuta || '').trim().toUpperCase();
                return {
                    NOMBRE: (kitData.nombre || (patientData && patientData.nombre) || '').toUpperCase(),
                    DNI: (kitData.dni || (patientData && patientData.dni) || '').toUpperCase(),
                    TELEFONOS: telefonosText.toUpperCase(),
                    MEDS_COUNT: cantidadMeds,
                    DIRECCION_ENTREGA: direccionEntrega.toUpperCase(),
                    OBSERVACIONES: observacionesEntrega,
                    CONTACT_CENTER_NAME: contactCenterName.toUpperCase() || '—',
                    CONTACT_CENTER_PHONE: contactCenterPhone.toUpperCase() || '—',
                    FECHA_ENTREGA: fechaEntrega || '—'
                };
            });
        }
        if (!contactCenterDisplay || contactCenterDisplay === '—') contactCenterDisplay = agenteName || '—';
        if (contactCenterDisplay && contactCenterDisplay.indexOf(sep) === -1) contactCenterDisplay = contactCenterDisplay + sep;
        var ccPartsSync = (contactCenterDisplay || '').split(sep);
        var contactCenterNameSync = (ccPartsSync[0] || '').trim();
        var contactCenterPhoneSync = (ccPartsSync[1] || '').trim();
        var fechaEntregaSync = '';
        if (kitData.fechaEntregaKit) {
            var d = new Date(kitData.fechaEntregaKit);
            if (!isNaN(d.getTime())) fechaEntregaSync = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (kitData.fechaArmado) {
            var d2 = new Date(kitData.fechaArmado);
            if (!isNaN(d2.getTime())) fechaEntregaSync = d2.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        var meds = kitData.medicamentos || [];
        var total = meds.length;
        var disp = meds.filter(function (m) { return m.dispensar !== false; }).length;
        var cant = total > 0 ? disp + '/' + total : '0/0';
        var obs = (kitData.observacionesEntrega || kitData.observations || kitData.obsRuta || '').trim().toUpperCase();
        return Promise.resolve({
            NOMBRE: (kitData.nombre || (patientData && patientData.nombre) || '').toUpperCase(),
            DNI: (kitData.dni || (patientData && patientData.dni) || '').toUpperCase(),
            TELEFONOS: telefonosText.toUpperCase(),
            MEDS_COUNT: cant,
            DIRECCION_ENTREGA: direccionEntrega.toUpperCase(),
            OBSERVACIONES: obs,
            CONTACT_CENTER_NAME: contactCenterNameSync.toUpperCase() || '—',
            CONTACT_CENTER_PHONE: contactCenterPhoneSync.toUpperCase() || '—',
            FECHA_ENTREGA: fechaEntregaSync || '—'
        });
    }
    var logoDefault = 'https://raw.githubusercontent.com/jose50440/bita/6a46e7144ce075c219a382364b611fa576fc5e4b/img/logo1.png';
    var logo2Default = 'https://raw.githubusercontent.com/jose50440/bita/6a46e7144ce075c219a382364b611fa576fc5e4b/img/logo2.png';
    function getLogos(opts) {
        var L1 = (typeof window !== 'undefined' && window.LOGO1_URL) ? window.LOGO1_URL : logoDefault;
        var L2 = (typeof window !== 'undefined' && window.LOGO2_URL) ? window.LOGO2_URL : logo2Default;
        return { logo1: L1, logo2: L2 };
    }
    var cssRuta = '@page{size:210mm 78mm landscape;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:210mm;height:78mm;margin:0;padding:0;font-family:\'Arial Black\',Arial,Helvetica,sans-serif;text-transform:uppercase;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:visible;}.ruta-sheet{width:208mm;height:78mm;margin:0 1mm;padding:0;position:relative;display:flex;flex-direction:column;gap:0.5mm;background:#fff;box-sizing:border-box;overflow:visible;}.ruta-header{display:flex;justify-content:center;align-items:center;padding:0.5mm 0;border-bottom:0.4mm solid #000;flex-shrink:0;width:100%;margin:0 3mm;box-sizing:border-box;}.ruta-title{font-size:2.8mm;font-weight:900;text-align:center;color:#000;letter-spacing:0.1mm;}.ruta-content{display:flex;gap:2.5mm;flex:1;min-height:0;margin:0 2mm 0 3mm;box-sizing:border-box;align-items:stretch;width:100%;}.ruta-lado-a{flex:0 0 auto;width:98mm;display:flex;flex-direction:column;gap:1.2mm;padding-right:1.2mm;border-right:0.3mm dashed #ccc;min-height:0;}.ruta-lado-a .ruta-fecha-con-logos{flex-shrink:0;margin-top:auto;}.ruta-lado-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.2mm;min-height:0;}.ruta-b1{flex:6;min-height:0;}.ruta-b2{flex:2;display:flex;flex-direction:row;gap:1.2mm;align-items:flex-start;min-height:0;}.ruta-b2-content{padding-right:23mm;box-sizing:border-box;}.ruta-b2-grid{display:flex;flex-direction:row;gap:1.5mm;flex:1;}.ruta-b2-col{display:flex;flex-direction:column;gap:0.3mm;padding:0.5mm 0.8mm;border:1px solid #d1d5db;border-radius:1.5mm;align-items:center;justify-content:center;text-align:center;}.ruta-b2-meds{flex:0.32;}.ruta-b2-contact{flex:0.68;}.ruta-b2-info-label{font-size:2.6mm;font-weight:900;color:#000;}.ruta-b2-info-value{font-size:3.2mm;font-weight:900;color:#000;word-wrap:break-word;line-height:1.2;}.ruta-b2-meds .ruta-b2-info-value{font-size:4.8mm;}.ruta-b2-cc-name{font-size:3.8mm;}.ruta-b2-cc-phone{font-size:3.6mm;font-weight:700;}.ruta-box{border:0.4mm solid #000;border-radius:1.5mm;padding:1.2mm 1.5mm;background:#fafafa;font-family:\'Arial Black\',Arial,sans-serif;}.ruta-box-address{border:0.6mm solid #000;border-radius:2.5mm;padding:2mm;background:#fff;min-height:0;flex:1;display:flex;flex-direction:column;height:100%;}.ruta-name{font-size:7.5mm;font-weight:900;color:#000;line-height:1.15;text-align:center;word-wrap:break-word;}.ruta-dni{font-size:7.5mm;font-weight:900;color:#000;line-height:1.15;text-align:center;word-wrap:break-word;}.ruta-field{font-size:4.2mm;font-weight:900;color:#000;line-height:1.25;word-wrap:break-word;text-align:center;}.ruta-field-label{font-size:3.6mm;font-weight:900;color:#333;margin-bottom:0.4mm;text-align:center;}.ruta-field-value{font-size:5mm;font-weight:900;color:#000;text-align:center;}.ruta-fecha-con-logos{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:1mm;padding:0.6mm 1mm;border:0.4mm solid #000;border-radius:1.5mm;background:#fafafa;box-sizing:border-box;}.ruta-fecha-con-logos .ruta-logo-interno{width:20mm;height:10mm;object-fit:contain;flex-shrink:0;}.ruta-fecha-con-logos .ruta-fecha-value,.ruta-fecha-con-logos .ruta-fecha-value-full{flex:1;min-width:0;}.ruta-fecha-value,.ruta-fecha-value-full{font-size:8.5mm;font-weight:900;color:#000;letter-spacing:0.15mm;line-height:1.15;font-family:\'Arial Black\',Arial,sans-serif;text-transform:uppercase;}.ruta-address-content{font-weight:900;color:#000;line-height:1.4;word-wrap:break-word;flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;min-height:0;text-align:center;}.ruta-address-text{flex:1;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box;text-align:center;font-family:\'Arial Black\',Arial,sans-serif;}@media print{body*{visibility:hidden;}.ruta-sheet,.ruta-sheet *{visibility:visible;}.ruta-sheet{position:absolute;left:0;top:0;}}';
    var cssVentanilla = '@page{size:71mm 165mm;margin:10mm 0;}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:71mm;min-height:145mm;height:145mm;margin:0;padding:0;font-family:\'Segoe UI\',Arial,Helvetica,sans-serif;text-transform:uppercase;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.sheet{width:71mm;min-height:145mm;height:145mm;padding:0.8mm 0.9mm;overflow:hidden;background:#fff;position:relative;display:flex;flex-direction:column;gap:1.1mm;}.v-logos-row{display:flex;align-items:center;justify-content:space-between;padding:0.8mm 0.9mm;margin:0;border:0.4mm solid #000;border-radius:2.5mm;background:#fff;}.v-logo{width:32mm;height:15mm;object-fit:contain;flex-shrink:0;}.v-title-full{font-size:2.9mm;font-weight:800;text-align:center;color:#000;line-height:1.25;letter-spacing:0.06mm;padding:0.9mm 0.8mm;margin:0;border:0.4mm solid #000;border-radius:2.5mm;background:#f9f9f9;}.v-box{border:0.4mm solid #000;border-radius:2.5mm;padding:0.7mm 0.9mm;margin:0;}.v-name-box{font-size:7.5mm;font-weight:900;color:#000;line-height:1.15;letter-spacing:0.08mm;word-wrap:break-word;text-align:center;background:#fafafa;}.v-dni-box{font-size:7.5mm;font-weight:900;color:#000;line-height:1.15;text-align:center;background:#fafafa;display:flex;flex-direction:column;gap:0.3mm;}.v-dni-box .v-dni-head{display:flex;align-items:center;justify-content:center;gap:0.5mm;}.v-dni-box .v-dni-label{font-size:2mm;font-weight:800;}.v-fecha-box,.v-cc-box{display:flex;flex-direction:column;gap:0.25mm;align-items:center;text-align:center;}.v-fecha-box .v-box-label,.v-cc-box .v-box-label{font-size:1.8mm;font-weight:800;color:#000;}.v-fecha-box .v-box-value{font-size:4.2mm;font-weight:700;color:#000;}.v-cc-box .v-box-value{font-size:3mm;font-weight:700;color:#000;}.v-meds{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.3mm;}.v-meds .v-meds-label{font-size:2.2mm;font-weight:800;}.v-meds .v-meds-value{font-size:6.5mm;font-weight:900;color:#000;text-align:center;}.v-refri{display:flex;align-items:center;justify-content:center;gap:0.7mm;padding:0.6mm 0.8mm;border:0.4mm solid #000;border-radius:2.5mm;margin:0;background:#fff3cd;font-size:2.8mm;font-weight:900;}.v-refri-icon{width:4mm;height:4mm;}.v-ventanilla{border:1.2mm solid #000;padding:2mm 1.4mm;text-align:center;font-size:7.5mm;font-weight:900;color:#000;margin:0;letter-spacing:0.2mm;background:linear-gradient(to bottom,#f5f5f5 0%,#e8e8e8 100%);display:flex;align-items:center;justify-content:center;gap:1.2mm;border-radius:2.5mm;}.v-ventanilla.has-obs{padding:1.4mm 1.2mm;font-size:6mm;}.v-obs{font-size:1.8mm;font-weight:700;color:#000;line-height:1.3;word-wrap:break-word;padding:0.7mm 0.9mm;margin:0;border:0.4mm solid #000;border-radius:2.5mm;background:#fafafa;text-align:center;}.v-footer{margin-top:auto;padding:1mm;font-size:2.8mm;text-align:center;color:#000;font-weight:700;border:0.4mm solid #000;border-radius:2.5mm;}.v-icon{width:3.5mm;height:3.5mm;}@media print{body*{visibility:hidden;}.sheet,.sheet *{visibility:visible;}.sheet{position:absolute;left:0;top:0;}}';
    var cssRefri = '@page{size:76mm 130mm;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:76mm;height:130mm;font-family:Arial;text-transform:uppercase;}.sheet{width:76mm;height:130mm;padding:0.8mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;}.refri-header{text-align:center;border-bottom:0.5mm solid #1a1a1a;padding:0.5mm 0;margin-bottom:0.6mm;width:100%;}.refri-header-title{font-size:2.5mm;font-weight:900;text-align:center;}.refri-banner{display:flex;align-items:center;justify-content:center;gap:0.8mm;background:#000;color:#fff;padding:1.2mm 1.5mm;margin:0.6mm 0;border-radius:1.5mm;width:100%;}.refri-banner-icon{width:4.5mm;height:4.5mm;}.refri-banner-logo{width:12mm;height:8mm;object-fit:contain;}.refri-banner-text{font-size:5.2mm;font-weight:900;}.refri-info-box{border:0.8mm solid #000;border-radius:2.5mm;padding:1.2mm 1.5mm;margin:0.5mm 0;width:100%;text-align:center;}.refri-info-content{font-size:5.5mm;font-weight:900;}.refri-info-fecha{font-size:5.7mm;font-weight:900;}.refri-info-phones{font-size:3.5mm;font-weight:700;}.refri-cantidad-box{border:1.5mm solid #000;border-radius:3.5mm;display:flex;align-items:center;justify-content:center;font-size:14mm;font-weight:900;width:100%;min-height:20mm;margin-top:0.5mm;}@media print{body*{visibility:hidden;}.sheet,.sheet *{visibility:visible;}.sheet{position:absolute;left:0;top:0;}}';

    function printRuta(kit, patient, options) {
        var opts = options || {};
        var db = opts.db;
        var users = opts.users || [];
        var contacts = opts.contacts || [];
        var logos = getLogos(opts);
        return resolveRutaPlaceholders(kit, patient, users, contacts, db).then(function (resolvedData) {
            var direccionYObs = [resolvedData.DIRECCION_ENTREGA, resolvedData.OBSERVACIONES].filter(Boolean).join(' | ');
            var fechaClass = 'ruta-fecha-value-full';
            var html = '<div class="ruta-sheet"><div class="ruta-header"><div class="ruta-title">FARMACIA DOMICILIARIA</div></div><div class="ruta-content"><div class="ruta-lado-a"><div class="ruta-box ruta-name">' + _vEsc(resolvedData.NOMBRE) + '</div><div class="ruta-box ruta-dni">' + _vEsc(resolvedData.DNI) + '</div><div class="ruta-box ruta-field"><div class="ruta-field-label">TELEFONOS DE CONTACTO DEL PACIENTE</div><div class="ruta-field-value">' + _vEsc(resolvedData.TELEFONOS) + '</div></div><div class="ruta-box ruta-fecha-box ruta-fecha-con-logos"><img src="' + _vEsc(logos.logo1) + '" alt="Logo 1" class="ruta-logo-interno" onerror="this.style.display=\'none\'"/><div class="' + fechaClass + '">' + _vEsc(resolvedData.FECHA_ENTREGA) + '</div><img src="' + _vEsc(logos.logo2) + '" alt="Logo 2" class="ruta-logo-interno" onerror="this.style.display=\'none\'"/></div></div><div class="ruta-lado-b"><div class="ruta-b1"><div class="ruta-box-address"><div class="ruta-address-content"><div class="ruta-address-text">' + _vEsc(direccionYObs) + '</div></div></div></div><div class="ruta-b2"><div class="ruta-b2-content"><div class="ruta-b2-grid"><div class="ruta-b2-col ruta-b2-meds"><span class="ruta-b2-info-label">MEDICAMENTOS</span><span class="ruta-b2-info-value">' + _vEsc(resolvedData.MEDS_COUNT) + '</span></div><div class="ruta-b2-col ruta-b2-contact"><span class="ruta-b2-info-label">CONTACT CENTER</span><span class="ruta-b2-info-value ruta-b2-cc-name">' + _vEsc(resolvedData.CONTACT_CENTER_NAME) + '</span><span class="ruta-b2-info-value ruta-b2-cc-phone">' + _vEsc(resolvedData.CONTACT_CENTER_PHONE) + '</span></div></div></div></div></div></div></div>';
            _vPw(html, cssRuta, 'Viñeta Ruta');
        });
    }

    function printVentanilla(kit, patient, options) {
        var uk = kit || {};
        var up = patient || {};
        var opts = options || {};
        var db = opts.db;
        var users = opts.users || [];
        var contacts = opts.contacts || [];
        var currentUser = opts.currentUser || {};
        var logos = getLogos(opts);
        var nombre = (uk.nombre || up.nombre || '').toUpperCase();
        var dni = (uk.dni || up.dni || '').toUpperCase();
        var fe = uk.fechaArmado || uk.fechaEntregaAsignada || '';
        var ccRaw = (uk.contactCenter || up.contactCenter || '').toString().trim();
        var ccNormalized = _vNormalizeCC(ccRaw);
        var agenteName = (up.agenteContactCenter || uk.agenteContactCenter || (ccRaw && ccRaw.indexOf(' --- ') === -1 && ccRaw.indexOf(' ----- ') === -1 ? ccRaw : '')).toString().trim();
        var contactCenterDisplay = ccNormalized;
        if (!contactCenterDisplay && agenteName && db) {
            return _vFetchAgentFromFirebase(agenteName, db).then(function (fromDb) {
                contactCenterDisplay = fromDb || _vFormatCC(agenteName, users, contacts);
                if (!contactCenterDisplay || contactCenterDisplay === '—') contactCenterDisplay = agenteName || '—';
                buildAndPrintVentanilla(uk, up, contactCenterDisplay, logos, currentUser);
            });
        }
        if (!contactCenterDisplay || contactCenterDisplay === '—') contactCenterDisplay = agenteName || '—';
        buildAndPrintVentanilla(uk, up, contactCenterDisplay, logos, currentUser);
        return Promise.resolve();
    }

    function buildAndPrintVentanilla(uk, up, contactCenterDisplay, logos, currentUser) {
        var nombre = (uk.nombre || up.nombre || '').toUpperCase();
        var dni = (uk.dni || up.dni || '').toUpperCase();
        var fe = uk.fechaArmado || uk.fechaEntregaAsignada || '';
        var observaciones = (uk.observations || uk.observacionesEntrega || '').trim().toUpperCase();
        var usuarioOperaciones = (uk.usuarioOperaciones || currentUser.name || currentUser.nombre || currentUser.username || currentUser.email || 'OPERADOR').toUpperCase();
        var medicamentos = uk.medicamentos || [];
        var totalMeds = medicamentos.length;
        var dispensadosMeds = medicamentos.filter(function (m) { return m.dispensar !== false; }).length;
        var cantidadMeds = totalMeds > 0 ? dispensadosMeds + '/' + totalMeds : '0/0';
        var isRefrigerado = uk.isRefrigerated || false;
        var cantRefri = uk.cantRefriGlobal || (isRefrigerado ? 1 : 0);
        var obsHtml = observaciones ? '<div class="v-obs">' + _vEsc(observaciones) + '</div>' : '';
        var ventanillaClass = observaciones ? 'v-ventanilla has-obs' : 'v-ventanilla';
        var iconId = '<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
        var iconCalendar = '<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
        var iconPhone = '<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
        var iconWindow = '<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';
        var iconMeds = '<svg class="v-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';
        var iconRefri = '<svg class="v-refri-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        var nameHtml = '<div class="v-box v-name-box">' + _vEsc(nombre) + '</div>';
        var dniHtml = '<div class="v-box v-dni-box"><div class="v-dni-head">' + iconId + '<span class="v-dni-label">DNI / AFILIACIÓN</span></div><div>' + _vEsc(dni) + '</div></div>';
        var fechaHtml = '<div class="v-box v-fecha-box"><div class="v-box-head">' + iconCalendar + '<span class="v-box-label">FECHA DE ENTREGA</span></div><div class="v-box-value">' + _vEsc(fe) + '</div></div>';
        var ccHtml = '<div class="v-box v-cc-box"><div class="v-box-head">' + iconPhone + '<span class="v-box-label">CONTACT CENTER</span></div><div class="v-box-value">' + _vEsc(contactCenterDisplay) + '</div></div>';
        var medsBoxHtml = '<div class="v-box v-meds"><div class="v-meds-label">MEDICAMENTOS</div><div class="v-meds-value">' + _vEsc(cantidadMeds) + '</div></div>';
        var refriBoxHtml = cantRefri > 0 ? '<div class="v-refri">' + iconRefri + '<span>REFRIGERADO: ' + _vEsc(String(cantRefri)) + '</span></div>' : '';
        var html = '<div class="sheet"><div class="v-logos-row"><img src="' + _vEsc(logos.logo1) + '" alt="Logo 1" class="v-logo" onerror="this.style.display=\'none\'"/><img src="' + _vEsc(logos.logo2) + '" alt="Logo 2" class="v-logo" onerror="this.style.display=\'none\'"/></div><div class="v-title-full">DEPARTAMENTO DE DISPENSACIÓN DE MEDICAMENTOS A DOMICILIO</div>' + nameHtml + dniHtml + fechaHtml + ccHtml + medsBoxHtml + refriBoxHtml + '<div class="' + ventanillaClass + '">' + iconWindow + ' VENTANILLA</div>' + obsHtml + '<div class="v-footer">OPERADOR DE EMPAQUE: ' + _vEsc(usuarioOperaciones) + '</div></div>';
        _vPw(html, cssVentanilla, 'Viñeta Ventanilla');
    }

    function printRefrigerado(kit, patient, options) {
        var uk = kit || {};
        var up = patient || {};
        var opts = options || {};
        var logos = getLogos(opts);
        var dn = (uk.nombre || up.nombre || '').toUpperCase();
        var di = (uk.dni || up.dni || '').toUpperCase();
        var fe = uk.fechaArmado || '';
        var cr = uk.isRefrigerated ? (uk.cantRefriGlobal || 1) : 0;
        var tipoDespacho = uk.tipoDespachoRefrigerado || 'SOLO REFRIGERADO';
        var esSoloRefri = tipoDespacho === 'SOLO REFRIGERADO';
        var tel1 = (up.telefono || '').toString().trim().toUpperCase();
        var tel2 = (up.telefonoFamiliar || '').toString().trim().toUpperCase();
        var phonesHtml = (esSoloRefri && (tel1 || tel2)) ? '<div class="refri-info-phones">' + _vEsc(tel1 ? (tel2 ? tel1 + ' | ' + tel2 : tel1) : tel2) + '</div>' : '';
        var iconRefri = '<svg class="refri-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        var bannerHtml = '<div class="refri-banner">' + iconRefri + '<img src="' + _vEsc(logos.logo1) + '" alt="" class="refri-banner-logo" onerror="this.style.display=\'none\'"/>' + iconRefri + '<span class="refri-banner-text">REFRIGERADO</span>' + iconRefri + '<img src="' + _vEsc(logos.logo2) + '" alt="" class="refri-banner-logo" onerror="this.style.display=\'none\'"/>' + iconRefri + '</div>';
        var html = '<div class="sheet"><div class="refri-header"><div class="refri-header-title"> FARMACIA DOMICILIARIA </div></div>' + bannerHtml + '<div class="refri-info-box"><div class="refri-info-content">' + _vEsc(dn) + '</div></div><div class="refri-info-box"><div class="refri-info-content">' + _vEsc(di) + '</div>' + phonesHtml + '</div><div class="refri-info-box"><div class="refri-info-fecha">' + _vEsc(fe) + '</div></div><div class="refri-cantidad-box">' + _vEsc(cr) + '</div></div>';
        _vPw(html, cssRefri, 'Viñeta Refrigerado');
        return Promise.resolve();
    }

    window.PrintVinetas = {
        printRuta: printRuta,
        printVentanilla: printVentanilla,
        printRefrigerado: printRefrigerado
    };
})();
