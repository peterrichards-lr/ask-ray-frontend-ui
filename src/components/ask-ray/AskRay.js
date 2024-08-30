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
import { useState, useEffect } from 'react';

import ClayIcon, { ClayIconSpriteContext } from '@clayui/icon';
import ClayAlert from '@clayui/alert';

import { Liferay } from '../../common/services/liferay/liferay';
import { buildSessionId } from '../../common/utility';
import { SESSION_STORAGE_KEY } from '../../common/const';
import googleAuth from '../../common/services/google-auth/api';
import Chatbot from '../chatbot/Chatbot';

const { REACT_APP_BACKEND_AUTH_HOST } = process.env;

const AskRay = (props) => {
  const {
    siteUrl,
    dialogflowProjectId,
    transcriptEndpoint,
    intentFulfilmentEndpoint,
    oauth2ClientErc,
    backendAuthEndpoint,
    maxEntries,
    assetLibraryId
  } = props;

  const actualUrl = siteUrl ? siteUrl : '';

  const [dialogflowAccessToken, setDialogflowAccessToken] = useState();
  const [showChatbot, setShowChatbot] = useState();
  const [sessionId, setSessionId] = useState();
  const [configured, setConfigured] = useState(true);

  if (configured && !dialogflowProjectId) {
    console.warn(
      'Ask Ray is not configured. Please supply the dialogflow-project-id attribute to client extension properties.'
    );
    setConfigured(false);
  }

  if (configured && !transcriptEndpoint) {
    console.warn(
      'Ask Ray is not configured. Please supply the transcript-endpoint attribute to client extension properties.'
    );
    setConfigured(false);
  }

  if (configured && !intentFulfilmentEndpoint) {
    console.warn(
        'Ask Ray is not configured. Please supply the intent-fulfilment-endpoint attribute to client extension properties.'
    );
    setConfigured(false);
  }

  if (configured && !oauth2ClientErc) {
    console.warn(
      'Ask Ray is not configured. Please supply the oauth2-client-erc attribute to client extension properties.'
    );
    setConfigured(false);
  }

  if (configured && !assetLibraryId) {
    console.info(
      'Ask Ray will perform a site level search.'
    );
  } else {
    console.info(
      'Ask Ray will perform a asset library level search.'
    );
  }

  console.debug('dialogflowProjectId', dialogflowProjectId);
  console.debug('transcriptEndpoint', transcriptEndpoint);
  console.debug('intentFulfilmentEndpoint', intentFulfilmentEndpoint);
  console.debug('oauth2ClientErc', oauth2ClientErc);
  assetLibraryId && console.debug('assetLibraryId', assetLibraryId);

  const signedIn = Liferay.ThemeDisplay.isSignedIn();

  const getSessionId = () => {
    var value = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (value) {
      return value;
    }
    const userEmailAddress = Liferay.ThemeDisplay.getUserEmailAddress();
    value = buildSessionId(userEmailAddress);
    sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    return value;
  };

  useEffect(() => {
    if (!signedIn || sessionId) {
      return;
    }

    if (!sessionId) {
      setSessionId(getSessionId());
    }
  }, [configured, signedIn, sessionId]);

  useEffect(() => {
    if (!configured || !sessionId) {
      return;
    }

    const endpoint = backendAuthEndpoint || REACT_APP_BACKEND_AUTH_HOST;
    googleAuth(endpoint, oauth2ClientErc).then((accessToken) => {
      setDialogflowAccessToken(accessToken);
    });
  }, [configured, oauth2ClientErc, sessionId]);

  const onClick = () => setShowChatbot(!showChatbot);

  const inPageEditor = () =>
    document.body.classList.contains('has-edit-mode-menu');

  const RayContainer = () => {
    if (signedIn && sessionId) {
      if (inPageEditor()) {
        return (
          <ClayAlert
            displayType="info"
            spritemap={Liferay.Icons.spritemap}
            title="Ready"
            style={{ marginBottom: 0 }}
          >
            Ask Ray has been configured and will render on the published page.
          </ClayAlert>
        );
      }
      return (
        <>
          <button onClick={onClick} className="btn btn-primary ray-button">
            <ClayIconSpriteContext.Provider value={Liferay.Icons.spritemap}>
              <ClayIcon symbol="quote-left" />
            </ClayIconSpriteContext.Provider>
          </button>
          <div
            className="ray-container"
            style={{ display: showChatbot ? 'block' : 'none' }}
          >
            <Chatbot
              siteUrl={actualUrl}
              dialogflowProjectId={dialogflowProjectId}
              dialogflowAccessToken={dialogflowAccessToken}
              dialogflowSessionId={sessionId}
              transcriptEndpoint={transcriptEndpoint}
              intentFulfilmentEndpoint={intentFulfilmentEndpoint}
              maxEntries={maxEntries}
              assetLibraryId={assetLibraryId}
            />
          </div>
        </>
      );
    }
  };

  return (
    <>
      {configured ? (
        <RayContainer />
      ) : (
        <ClayAlert
          displayType="warning"
          spritemap={Liferay.Icons.spritemap}
          title="Configuration Required"
          style={{ marginBottom: 0 }}
        >
          You need to configure the Ask Ray chatbot.
        </ClayAlert>
      )}
    </>
  );
};

export default AskRay;
