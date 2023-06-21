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

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import ClayAlert from '@clayui/alert';

import {
  recentConversationApi,
  recordQuery,
  recordResponse,
  callDialogflow,
  performLiferaySearch,
} from './ChatbotApi';

import { SPEECH_VOICE, DIALOGFLOW_LANGUAGE_CODE } from '../../common/const';

import '../../common/styles/index.scss';

const Chatbot = (props) => {
  const {
    siteUrl,
    dialogflowProjectId,
    dialogflowAccessToken,
    dialogflowSessionId,
    objectEndpoint,
    maxEntries,
  } = props;

  const chatWindowEnd = useRef(null);

  const [recentConversation, setRecentConversation] = useState([]);
  const [searchObjectArray, setSearchObjectArray] = useState([]);
  const [buttonLink, setButtonLink] = useState('');
  const [voiceQuery, setVoiceQuery] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [scrollForResponse, setScrollForResponse] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    recentConversationApi(objectEndpoint, dialogflowSessionId, maxEntries)
      .then((response) => {
        const { items, pageSize, totalCount } = response;
        if (items === undefined || !(items instanceof Array)) {
          console.warn('Items is not an array');
          return;
        }
        if (pageSize < totalCount) {
          console.warn(
            `The returned set of items is not the full set: returned ${pageSize}, set size ${totalCount}`
          );
        }
        if (items.length !== pageSize) {
          console.debug(
            `There are fewer items than requested: requested: returned ${items.length}, requested ${pageSize}`
          );
        }

        setRecentConversation(items.reverse());
        setMessageSent(false);
      })
      .catch((reason) => console.error(reason));
  }, [objectEndpoint, messageSent]);

  const onSubmit = (data, event) => {
    setSearchObjectArray([]);
    setButtonLink('');
    setVoiceQuery(false);
    setScrollForResponse(false);
    processQuery(data);
    if (event && event.nativeEvent && event.nativeEvent.srcElement) {
      event.nativeEvent.srcElement.reset();
    }
  };

  const processQuery = (data) => {
    recordQuery(objectEndpoint, dialogflowSessionId, data.query)
      .then(() => {
        setMessageSent(true);
      })
      .catch((reason) => console.error(reason));
    callDialogflow(
      dialogflowProjectId,
      dialogflowAccessToken,
      dialogflowSessionId,
      data.query
    )
      .then(function (response) {
        const queryResult = response.queryResult;
        recordResponse(objectEndpoint, dialogflowSessionId, queryResult);
        setMessageSent(true);

        if (queryResult.fulfillmentMessages) {
          const fulfillmentMessages = queryResult.fulfillmentMessages;
          const fulfillmentMessageCount = fulfillmentMessages.length;
          console.debug('fulfillmentMessageCount', fulfillmentMessageCount);
          console.debug('fulfillmentMessages', fulfillmentMessages);
          if (fulfillmentMessageCount > 0) {
            if (voiceQuery) {
              const text = fulfillmentMessages['0'].text.text['0'];
              speakResult(text);
            }

            if (fulfillmentMessageCount > 1) {
              if (fulfillmentMessages['1'].payload) {
                const payload = fulfillmentMessages['1'].payload;
                if (payload.redirect) {
                  console.debug('redirect', payload.redirect);
                  const cleanedUrl = cleanUrl(payload.redirect);
                  const actualUrl = buildSiteUrl(cleanedUrl);
                  setButtonLink(actualUrl);
                  return;
                } else if (payload.search) {
                  console.debug('search', payload.search);
                  liferaySearch(payload.search);
                  return;
                }
              }
            }
            console.debug('action');
            getLink(queryResult.action);
          }
        }
      })
      .catch((reason) => console.error(reason));
  };

  const captureSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = DIALOGFLOW_LANGUAGE_CODE;
    recognition.start();
    recognition.onresult = function (event) {
      let speechResult = {};
      speechResult.query = event.results['0']['0'].transcript;
      setVoiceQuery(true);
      processQuery(speechResult);
    };
  };

  const speakResult = (text) => {
    let synth = window.speechSynthesis;
    let msg = new SpeechSynthesisUtterance();
    const voices = synth.getVoices();
    msg.voice = voices.filter(function (voice) {
      return voice.name === SPEECH_VOICE;
    })[0];
    msg.text = text;
    synth.speak(msg);
  };

  const handleEnter = (event) => {
    if (event.keyCode == 13) {
      const btn = document.querySelector('#askRaySubmitButton');
      if (btn) {
        btn.click();
        event.preventDefault();
      }
    }
  };

  const liferaySearch = (searchPhrase) => {
    performLiferaySearch(searchPhrase)
      .then((response) => {
        const { items, pageSize, totalCount } = response;
        let searchObjectArray = [];
        if (items === undefined || !(items instanceof Array)) {
          console.warn('Items is not an array');
          return;
        }
        if (pageSize < totalCount) {
          console.warn(
            `The returned set of items is not the full set: returned ${pageSize}, set size ${totalCount}`
          );
        }
        if (items.length !== pageSize) {
          console.debug(
            `There are fewer items than requested: requested: returned ${items.length}, requested ${pageSize}`
          );
        }

        for (let i = 0; i < items.length; i++) {
          if (i > 2) {
            break;
          }
          let searchObject = { title: '', description: '', friendlyUrl: '' };
          let fields = items[i].contentFields;
          searchObject.friendlyUrl = items[i].friendlyUrlPath;
          console.debug(items[i].friendlyUrlPath);
          for (let g = 0; g < fields.length; g++) {
            const fieldName = fields[g].name?.toLowerCase();
            if (fieldName === 'title' || fieldName === 'question') {
              searchObject.title = fields[g].contentFieldValue.data;
            }
            if (
              fieldName === 'description' ||
              fieldName === 'header' ||
              fieldName === 'shortanswer'
            ) {
              searchObject.description = fields[g].contentFieldValue.data;
            }
          }
          console.debug(searchObject);
          searchObjectArray.push(searchObject);
        }

        if (searchObjectArray.length > 0) {
          console.debug(searchObjectArray);
          setSearchObjectArray(searchObjectArray);
        }
      })
      .catch((reason) => console.error(reason));
  };

  const buildSiteUrl = (path) => {
    let url = `${window.location.origin}${siteUrl ? `${siteUrl}` : ''}`;
    url = url + path;
    return url.replace(/([^:]\/)\/+/g, '$1');
  };

  const cleanUrl = (url) => {
    let cleanUrl = '';
    if (!url) {
      return cleanUrl;
    }

    // clean up old liferayboitcs urls
    if (url.indexOf('liferaybotics') > -1) {
      if (url.indexOf('/web/liferaybotics') > -1) {
        cleanUrl = url.replace('/web/liferaybotics', '');
      } else if (url.indexOf('/group/liferaybotics') > -1) {
        cleanUrl = url.replace('/group/liferaybotics', '');
      }
    } else {
      cleanUrl = url;
    }
    return cleanUrl;
  };

  const getLink = (action) => {
    if (action === 'blog') {
      return buildSiteUrl('/blogs');
    } else {
      console.warn('Unkoown action', action);
    }
  };

  const RenderSearchResults = () => {
    const urlString = buildSiteUrl('/-/');
    return (
      <div className="conversation-search-results">
        {searchObjectArray.map((search, index) => (
          <div key={index}>
            <h3>{search.title}</h3>
            <p>
              <i>{search.description}</i>
            </p>
            <a
              className="btn btn-primary"
              href={urlString + search.friendlyUrl}
            >
              Read content...
            </a>
          </div>
        ))}
      </div>
    );
  };

  const RenderButton = () => {
    if (buttonLink) {
      setScrollForResponse(true);
      return (
        <div className="conversation-button">
          <a className="btn btn-primary" href={buttonLink}>
            Open
          </a>
        </div>
      );
    } else {
      return <></>;
    }
  };

  const scrollToBottom = () => {
    chatWindowEnd.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [searchObjectArray, scrollForResponse]);

  return (
    <div
      data-analytics-asset-type="custom"
      data-analytics-asset-id="Ask Ray React"
      data-analytics-asset-category="ask-ray-form"
      data-analytics-asset-title="Ask Ray Form"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="chatHistory">
          {recentConversation.length == 0 ? (
            <ClayAlert
              displayType="info"
              spritemap={Liferay.Icons.spritemap}
              title="Info"
              style={{ marginBottom: 0 }}
            >
              You are at the start of this conversation
            </ClayAlert>
          ) : (
            recentConversation.map((exchange) => (
              <div
                className={
                  exchange.type.key === 'query'
                    ? 'conversation conversation-query'
                    : 'conversation conversation-response'
                }
                key={exchange.id}
              >
                <span className="message-header">
                  {exchange.type.key === 'query'
                    ? 'You said...'
                    : 'Ray said...'}
                </span>
                <span className="message-body">
                  {exchange.fulfilmentMessage}
                </span>
              </div>
            ))
          )}
          <RenderButton />
          <RenderSearchResults />
        </div>
        <div className="query-container">
          <input
            className="field form-control"
            onKeyDown={handleEnter}
            {...register('query')}
          />
        </div>
        <div className="button-container">
          <button
            className="btn icon btn-primary"
            value="submit"
            name="go"
            type="submit"
            id="askRaySubmitButton"
          >
            Go
          </button>
          <button
            className="btn icon btn-primary"
            onClick={captureSpeech}
            name="micbutton"
            type="button"
            value="Speak"
          >
            Speak
          </button>
        </div>
      </form>
      <div ref={chatWindowEnd} />
    </div>
  );
};

export default Chatbot;
