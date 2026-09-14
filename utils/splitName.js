// The User schema still stores firstName/lastName separately, but the admin
// panel (and its API contract) only ever collects/shows a single "Full
// Name" field. This splits that single field into firstName/lastName so
// existing schema/validation keeps working without a data migration, and
// joins them back for display.
function splitName(raw) {
  const parts = String(raw || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function joinName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

module.exports = { splitName, joinName };
