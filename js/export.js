'use strict';

function exportCSV() {
  const lines = ['TIPO;ID;DATOS'];

  D.inmuebles.forEach(x =>
      lines.push(`INMUEBLE;${x.id};${x.tipo}|${x.direccion}|${x.poblacion}|${x.estado}|${x.alquiler}|${x.precio_compra}`)
  );
  D.inquilinos.forEach(x => {
    const inms = D.inmuebles.filter(im => im.inquilino_id === x.id).map(im => im.direccion).join('+');
    lines.push(`INQUILINO;${x.id};${x.nombre}|${x.telefono}|${x.email}|${inms}|${x.estado}`);
  });
  D.cobros.forEach(x =>
      lines.push(`COBRO;${x.id};${x.inmueble_id}|${x.mes}|${x.importe}|${x.estado}|${x.fecha_pago}`)
  );
  D.gastos.forEach(x =>
      lines.push(`GASTO;${x.id};${x.inmueble_id}|${x.fecha}|${x.concepto}|${x.importe}|${x.categoria}`)
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'inmoapp_export.csv';
  a.click();
  showToast('✅ CSV exportado');
}