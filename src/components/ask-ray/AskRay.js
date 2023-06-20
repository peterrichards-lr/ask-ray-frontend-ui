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

import ClayIcon, { ClayIconSpriteContext } from '@clayui/icon';

import { Liferay } from '../../common/services/liferay/liferay';
import { buildSessionId } from '../../common/utility';
import { SESSION_STORAGE_KEY } from '../../common/const';
import googleAuth from '../../common/services/google-auth/api';
import Chatbot from '../chatbot/Chatbot';
import { useState, useEffect } from 'react';

const AskRay = (props) => {
  const { siteUrl, dialogflowProjectId, objectEndpoint, oauth2ClientErc, maxEntries } =
    props;

  const actualUrl = siteUrl ? siteUrl : '';

  const [dialogflowAccessToken, setDialogflowAccessToken] = useState();
  const [showChatbot, setShowChatbot] = useState();
  const [sessionId, setSessionId] = useState();

  console.debug('dialogflowProjectId', dialogflowProjectId);
  console.debug('objectEndpoint', objectEndpoint);
  console.debug('oauth2ClientErc', oauth2ClientErc);

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
  }, [signedIn, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    googleAuth(oauth2ClientErc).then((accessToken) => {
      setDialogflowAccessToken(accessToken);
    });
  }, [oauth2ClientErc, sessionId]);

  const onClick = () => setShowChatbot(!showChatbot);

  return (
    <>
      {signedIn && sessionId ? (
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
              objectEndpoint={objectEndpoint}
              maxEntries={maxEntries}
            />
          </div>
        </>
      ) : null}
    </>
  );
};

export default AskRay;
