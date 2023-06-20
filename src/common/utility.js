/**
 * Copyright (c) 2000-present Liferay, Inc. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more
 * details.
 */

import {
  FILTER_PARAM,
  PAGE_PARAM,
  PAGE_SIZE_PARAM,
  SORT_ASCENDING,
  SORT_DESCENDING,
  SORT_PARAM,
} from './const';

import md5 from 'MD5';
import { isValid, format } from 'date-fns';

const pad = (num, size) => {
  num = num.toString();
  while (num.length < size) num = '0' + num;
  return num;
};

// The filter sytax for custom fields within an Object, are simply dates and need to remove the time element
const customDateFieldFormat = (date) => {
  if (date !== undefined && date instanceof Date)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(
      date.getDate(),
      2
    )}`;
};

// The filter syntax for system date fime fields, such as dateCreated and dateModified, need the time element
const systemDateFieldFormat = (date) => {
  if (date !== undefined && date instanceof Date)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(
      date.getDate(),
      2
    )}T${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(
      date.getSeconds(),
      2
    )}Z`;
};

const buildSort = (field, ascending = true) => {
  if (ascending !== undefined && typeof ascending === 'boolean') {
    return `${field}:${ascending ? SORT_ASCENDING : SORT_DESCENDING}`;
  }
  return field ? `${field}:${SORT_ASCENDING}` : undefined;
};

const buildObjectAPISearchParams = (filter, page, pageSize, sort) => {
  const urlSearchParams = new URLSearchParams();
  if (filter) urlSearchParams.append(FILTER_PARAM, filter);
  if (page) urlSearchParams.append(PAGE_PARAM, page);
  if (pageSize) urlSearchParams.append(PAGE_SIZE_PARAM, pageSize);
  if (sort) urlSearchParams.append(SORT_PARAM, sort);
  return urlSearchParams;
};

const getCssVariable = (variableName) => {
  if (variableName === undefined || typeof variableName !== 'string') {
    return undefined;
  }
  variableName = variableName.startsWith('--')
    ? variableName
    : `--${variableName}`;
  return window.getComputedStyle(document.body).getPropertyValue(variableName);
};

const isNumeric = (str) => {
  if (typeof str != 'string') return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
};

const propsStrToObj = (strProps) => {
  var objProps = {};
  for (const prop in strProps) {
    const value = strProps[prop];
    if (isNumeric(value)) {
      const num = Number(value);
      objProps[prop] = Number.isInteger(num) ? parseInt(num) : parseFloat(num);
    } else if (isValid(value)) {
      objProps[prop] = new Date(value);
    } else if (typeof value === 'string' && value.toLowerCase() === 'true') {
      objProps[prop] = true;
    } else if (typeof value === 'string' && value.toLowerCase() === 'false') {
      objProps[prop] = false;
    } else {
      objProps[prop] = value;
    }
  }
  return objProps;
};

const htmlAttributesToJson = (nodeMap) => {
  if (!(nodeMap instanceof NamedNodeMap)) {
    return undefined;
  }
  var json = {};
  for (var i = 0; i < nodeMap.length; i++) {
    const namedNode = nodeMap.item(i);
    json[namedNode.name] = namedNode.value;
  }
  return json;
};

const buildUrlPath = (pathTemplate, values) => {
  var path = pathTemplate;
  for (const [key, value] of Object.entries(values)) {
    path = path.replace(`[${key}]`, value);
  }
  return path;
};

const appendLine = (
  base,
  appendix,
  useSeperator = true,
  seperator = ', ',
  appendWhitespaceString = false
) => {
  if (
    !appendWhitespaceString &&
    typeof appendix === 'string' &&
    appendix.trim() === ''
  )
    return base;

  if (appendix) {
    if (useSeperator && base !== '') {
      return (base += seperator + appendix);
    } else {
      return (base += appendix);
    }
  }
  return base;
};

const formatAddress = (addressObj) => {
  var address = '';

  if (addressObj.hasOwnProperty('street1'))
    address = appendLine(address, addressObj.street1, false);

  if (addressObj.hasOwnProperty('street2'))
    address = appendLine(address, addressObj.street2);

  if (addressObj.hasOwnProperty('street3'))
    address = appendLine(address, addressObj.street3);

  if (addressObj.hasOwnProperty('city'))
    address = appendLine(address, addressObj.city);

  if (addressObj.hasOwnProperty('country'))
    address = appendLine(address, addressObj.country.toUpperCase());

  if (addressObj.hasOwnProperty('zip'))
    address = appendLine(address, addressObj.zip);

  return address;
};

const formatTitleCase = (str) => {
  if (!str || typeof str !== 'string') {
    return str;
  }
  const lc = str.toLowerCase();
  return lc.charAt(0).toUpperCase() + lc.slice(1);
};

const buildGraphQlQuery = (operation, requestBody, parameters) => {
  var parameterList = '';
  if (parameters) {
    const objectEntries = Object.entries(parameters);
    for (const [key, value] of objectEntries) {
      parameterList +=
        parameterList.length > 0 ? `,${key}:${value}` : `${key}:${value}`;
    }
  }

  return JSON.stringify({
    query: `{ ${operation}(${parameterList}) { ${requestBody} } }`,
  });
};

const parseGraphQlQueryResponse = (operation, response) => {
  const { data } = JSON.parse(response);
  return data[operation] ? data[operation] : {};
};

const createRandomString = (length) => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const buildSessionId = (userIdentifier) => {
  if (!userIdentifier) {
    throw new Error('A value must be provided');
  }
  console.debug('userIdentifier', userIdentifier);
  const hash = md5(userIdentifier);
  const datetime = format(new Date(), 'yyyyMMddHHmm');
  const id = createRandomString(4);
  const sessionId = `${hash}-${datetime}-${id}`;
  console.debug('sessionId', sessionId);
  return sessionId;
};

export {
  customDateFieldFormat,
  systemDateFieldFormat,
  buildSort,
  buildObjectAPISearchParams,
  getCssVariable,
  isNumeric,
  propsStrToObj,
  htmlAttributesToJson,
  buildUrlPath,
  formatAddress,
  formatTitleCase,
  buildGraphQlQuery,
  parseGraphQlQueryResponse,
  createRandomString,
  buildSessionId,
};
