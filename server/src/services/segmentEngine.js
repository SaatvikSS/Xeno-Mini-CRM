/**
 * Segment Evaluation Engine
 * 
 * Converts structured segment rules into MongoDB queries
 * and evaluates them against the customer collection.
 */
const Customer = require('../models/Customer');

/**
 * Convert a single condition to a MongoDB filter object
 */
function conditionToMongoFilter(condition) {
  const { field, operator, value } = condition;

  // Handle computed field: days_since_last_order
  if (field === 'days_since_last_order') {
    const date = new Date();
    date.setDate(date.getDate() - Number(value));
    
    switch (operator) {
      case 'gt': return { last_order_date: { $lt: date } };
      case 'gte': return { last_order_date: { $lte: date } };
      case 'lt': return { last_order_date: { $gt: date } };
      case 'lte': return { last_order_date: { $gte: date } };
      case 'eq': {
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return { last_order_date: { $gte: date, $lt: dayEnd } };
      }
      default: return {};
    }
  }

  // Date fields
  const dateFields = ['last_order_date', 'first_order_date'];
  const isDateField = dateFields.includes(field);

  switch (operator) {
    case 'eq':
      return { [field]: isDateField ? new Date(value) : value };
    case 'neq':
      return { [field]: { $ne: isDateField ? new Date(value) : value } };
    case 'gt':
      return { [field]: { $gt: isDateField ? new Date(value) : Number(value) } };
    case 'gte':
      return { [field]: { $gte: isDateField ? new Date(value) : Number(value) } };
    case 'lt':
      return { [field]: { $lt: isDateField ? new Date(value) : Number(value) } };
    case 'lte':
      return { [field]: { $lte: isDateField ? new Date(value) : Number(value) } };
    case 'contains':
      // For array fields (tags, channel_preferences) — check if array contains value
      // For string fields — regex match
      if (['tags', 'channel_preferences'].includes(field)) {
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      }
      return { [field]: { $regex: value, $options: 'i' } };
    case 'not_contains':
      if (['tags', 'channel_preferences'].includes(field)) {
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
      }
      return { [field]: { $not: { $regex: value, $options: 'i' } } };
    case 'in':
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case 'not_in':
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    case 'between':
      // Expects value to be [min, max]
      if (Array.isArray(value) && value.length === 2) {
        if (isDateField) {
          return { [field]: { $gte: new Date(value[0]), $lte: new Date(value[1]) } };
        }
        return { [field]: { $gte: Number(value[0]), $lte: Number(value[1]) } };
      }
      return {};
    default:
      return {};
  }
}

/**
 * Build a MongoDB query from segment rules
 */
function buildQuery(rules) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return {};
  }

  const filters = rules.conditions.map(conditionToMongoFilter);
  
  if (filters.length === 1) return filters[0];

  const mongoOperator = rules.operator === 'OR' ? '$or' : '$and';
  return { [mongoOperator]: filters };
}

/**
 * Evaluate a segment and return matching customers
 */
async function evaluateSegment(rules, options = {}) {
  const { limit, skip, countOnly = false } = options;
  const query = buildQuery(rules);

  if (countOnly) {
    return Customer.countDocuments(query);
  }

  let q = Customer.find(query);
  if (skip) q = q.skip(skip);
  if (limit) q = q.limit(limit);
  
  return q.lean();
}

/**
 * Get the count of customers matching segment rules
 */
async function getSegmentCount(rules) {
  return evaluateSegment(rules, { countOnly: true });
}

module.exports = {
  buildQuery,
  evaluateSegment,
  getSegmentCount,
  conditionToMongoFilter,
};
