'use strict';

// ─── SUPABASE ────────────────────────────────────────────────────────────────

const SUPABASE_URL      = 'https://difgwfrklhqkmzifsiax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZmd3ZnJrbGhxa216aWZzaWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDI4MDYsImV4cCI6MjA5MDQ3ODgwNn0.cBcfUzrK7r7mhLxF_R3FldpU5o3j8g2Bgmdss8Gxn2g';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DATA STORE ───────────────────────────────────────────────────────────────

const D = {
  inmuebles:  [],
  inquilinos: [],
  contratos:  [],
  cobros:     [],
  gastos:     [],
  categorias: [],
  documents:  [],
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const hoy      = new Date();
const ymActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');

const CATS_DEFAULT = [
  { nombre: 'Nave',     emoji: '🏭' },
  { nombre: 'Local',    emoji: '🏪' },
  { nombre: 'Vivienda', emoji: '🏠' },
  { nombre: 'Garaje',   emoji: '🚗' },
  { nombre: 'Trastero', emoji: '📦' },
];

const INM_HEADER_COLORS = [
  'linear-gradient(135deg,#1e3a5f,#2d6a9f)',
  'linear-gradient(135deg,#1a4731,#2d8653)',
  'linear-gradient(135deg,#4a1942,#8b3a8f)',
  'linear-gradient(135deg,#7c2d12,#c2410c)',
  'linear-gradient(135deg,#1e3a5f,#0f766e)',
  'linear-gradient(135deg,#3b0764,#7c3aed)',
  'linear-gradient(135deg,#1c1917,#57534e)',
  'linear-gradient(135deg,#0c4a6e,#0284c7)',
];
const _inmColors = {};

function getInmColor(id) {
  if (!_inmColors[id]) _inmColors[id] = INM_HEADER_COLORS[id % INM_HEADER_COLORS.length];
  return _inmColors[id];
}

// ─── ESTAT GLOBAL COBROS ─────────────────────────────────────────────────────

let cobKpiFilter  = '';
let cobInmsFilter = null;
let cobPagina     = 1;
const COB_PER_PAG = 15;

// ─── ESTAT GLOBAL D'EDICIO ───────────────────────────────────────────────────

let editingId       = null;
let currentInmueble = null;

// ─── LOOKUP HELPERS ───────────────────────────────────────────────────────────

function getInm(id) {
  return D.inmuebles.find(function(x) { return Number(x.id) === Number(id); });
}

function getInq(id) {
  return D.inquilinos.find(function(x) { return Number(x.id) === Number(id); });
}

function getContrato(id) {
  return D.contratos.find(function(x) { return Number(x.id) === Number(id); });
}

function getContratosInmueble(inmId) {
  return D.contratos.filter(function(c) { return Number(c.inmueble_id) === Number(inmId); });
}

function getContratoActivo(inmId) {
  return D.contratos.find(function(c) { return Number(c.inmueble_id) === Number(inmId) && c.activo; });
}

function getContratosInquilino(inqId) {
  return D.contratos.filter(function(c) { return Number(c.inquilino_id) === Number(inqId); });
}

function getContratosActivosInquilino(inqId) {
  return D.contratos.filter(function(c) { return Number(c.inquilino_id) === Number(inqId) && c.activo; });
}

function getRentaInq(inqId) {
  return getContratosActivosInquilino(inqId).reduce(function(a, c) { return a + Number(c.importe || 0); }, 0);
}

function getInmueblesInquilino(inqId) {
  return getContratosActivosInquilino(inqId).map(function(c) { return getInm(c.inmueble_id); }).filter(Boolean);
}

// Filtre per contractes específics (per historial d'immoble o inquilí)
let cobContratosFilter = null;