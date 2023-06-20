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

import { buildObjectAPISearchParams, buildSort } from '../../common/utility';
import { getFetch, postFetch } from '../../common/services/liferay/api';
import { Liferay } from '../../common/services/liferay/liferay';
import {
  SORT_FIELD,
  SESSION_ID_FIELD,
  DIALOGFLOW_LANGUAGE_CODE,
  FLATTEN_PARAM,
  SEARCH_PARAM,
} from '../../common/const';

const recentConversationApi = (objectEndpoint, sessionId, maxEntries) => {
  console.debug(`Param objectEndpoint=${objectEndpoint}`);
  console.debug(`Param maxEntries=${maxEntries}`);

  const API_PATH = `${window.location.origin}/o/c/${objectEndpoint}`;
  const actualMaxEntries =
    maxEntries && typeof maxEntries === 'number' ? maxEntries : 7;

  console.debug(`Using maxEntries=${actualMaxEntries}`);

  const filter = `${SESSION_ID_FIELD} eq '${sessionId}'`;
  const sort = buildSort(SORT_FIELD, false);
  const searchParams = buildObjectAPISearchParams(
    filter,
    1,
    actualMaxEntries,
    sort
  );

  return getFetch(API_PATH, searchParams);
};

const recordQuery = (objectEndpoint, sessionId, query) => {
  console.debug(`Param objectEndpoint=${objectEndpoint}`);

  const API_PATH = `${window.location.origin}/o/c/${objectEndpoint}`;

  const payload = {
    type: 'query',
    sessionId,
    fulfilmentMessage: query,
  };

  return postFetch(API_PATH, payload);
};

const recordResponse = (objectEndpoint, sessionId, queryResult) => {
  console.debug(`Param objectEndpoint=${objectEndpoint}`);
  console.debug(`Param queryResult=${queryResult}`);

  const API_PATH = `${window.location.origin}/o/c/${objectEndpoint}`;

  const fulfillmentMessageCount = queryResult.fulfillmentMessages.length;

  const payload = {
    type: 'response',
    sessionId,
    query: queryResult.queryText,
    action: queryResult.action,
    fulfilmentMessage:
      fulfillmentMessageCount > 0
        ? queryResult.fulfillmentMessages['0'].text.text['0']
        : '',
    response: queryResult,
  };

  return postFetch(API_PATH, payload);
};

const callDialogflow = async (
  dialogflowProjectId,
  dialogflowAccessToken,
  sessionId,
  query
) => {
  const apiAiRequest = {
    query_input: {
      text: {
        text: query,
        language_code: DIALOGFLOW_LANGUAGE_CODE,
      },
    },
  };
  console.debug('apiAiRequest', apiAiRequest);
  let dialogflowUrl = `https://dialogflow.googleapis.com/v2/projects/${dialogflowProjectId}/agent/sessions/${sessionId}:detectIntent`;
  const response = await fetch(dialogflowUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + dialogflowAccessToken,
    },
    body: JSON.stringify(apiAiRequest),
  });
  return await response.json();
};

const performLiferaySearch = (searchPhrase) => {
  const groupId = Liferay.ThemeDisplay.getSiteGroupId();
  const API_PATH = `${window.location.origin}/o/headless-delivery/v1.0/sites/${groupId}/structured-contents`;

  const searchParams = new URLSearchParams();
  searchParams.append(FLATTEN_PARAM, true);
  searchParams.append(SEARCH_PARAM, searchPhrase);

  return getFetch(API_PATH, searchParams);
};

export {
  recentConversationApi,
  recordQuery,
  recordResponse,
  callDialogflow,
  performLiferaySearch,
};
