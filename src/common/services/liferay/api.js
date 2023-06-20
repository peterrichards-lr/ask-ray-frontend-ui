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

import { Liferay } from './liferay';

const LIFERAY_HOST =
  process.env.REACT_APP_LIFERAY_HOST || window.location.origin;
const HEADER_CONTENT_TYPE = 'Content-Type';
const HEADER_CONTENT_TYPE_JSON = 'application/json';

const baseFetch = async (path, searchParams, contentType, options = {}) => {
  var url;
  if (searchParams !== undefined && searchParams instanceof URLSearchParams) {
    const queryString = searchParams.toString();
    url = new URL(`${path}?${queryString}`, LIFERAY_HOST);
  } else {
    url = new URL(path, LIFERAY_HOST);
  }

  const headers = {
    'Content-Type': contentType,
    'x-csrf-token': Liferay.authToken,
  };

  return fetch(url, {
    headers,
    ...options,
  }).then((response) => {
    const { status } = response;
    const responseContentType = response.headers.get(HEADER_CONTENT_TYPE);

    if (status === 204) {
      return '';
    } else if (
      response.ok &&
      responseContentType === HEADER_CONTENT_TYPE_JSON
    ) {
      return response.json();
    } else {
      return response.text();
    }
  });
};

const getFetch = async (
  path,
  searchParams = undefined,
  contentType = HEADER_CONTENT_TYPE_JSON,
  options = {}
) => {
  return baseFetch(path, searchParams, contentType, {
    method: 'GET',
    ...options,
  });
};

const postFetch = async (
  path,
  body,
  searchParams = undefined,
  contentType = HEADER_CONTENT_TYPE_JSON,
  options = {}
) => {
  return baseFetch(path, searchParams, contentType, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
};

export { getFetch, postFetch };
