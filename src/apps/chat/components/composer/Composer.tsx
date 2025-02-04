import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, Button, Card, Grid, IconButton, ListDivider, ListItemDecorator, Menu, MenuItem, ModalProps, Stack, Textarea, Tooltip, Typography, useTheme } from '@mui/joy';
import { ColorPaletteProp, SxProps, VariantProp } from '@mui/joy/styles/types';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import DataArrayIcon from '@mui/icons-material/DataArray';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MicIcon from '@mui/icons-material/Mic';
import PanToolIcon from '@mui/icons-material/PanTool';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StopOutlinedIcon from '@mui/icons-material/StopOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { ContentReducer } from '~/modules/aifn/summarize/ContentReducer';
import { useChatLLM } from '~/modules/llms/store-llms';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import { ConfirmationModal } from '~/common/components/ConfirmationModal';
import { countModelTokens } from '~/common/llm-util/token-counter';
import { extractFilePathsWithCommonRadix } from '~/common/util/dropTextUtils';
import { hideOnDesktop, hideOnMobile } from '~/common/theme';
import { htmlTableToMarkdown } from '~/common/util/htmlTableToMarkdown';
import { pdfToText } from '~/common/util/pdfToText';
import { useChatStore } from '~/common/state/store-chats';
import { useSpeechRecognition } from '~/common/components/useSpeechRecognition';
import { useUIPreferencesStore, useUIStateStore } from '~/common/state/store-ui';

import { SendModeId } from '../../Chat';
import { SendModeMenu } from './SendModeMenu';
import { TokenBadge } from './TokenBadge';
import { TokenProgressbar } from './TokenProgressbar';
import { useComposerStore } from './store-composer';
import Wallet_Service from '~/modules/webln/wallet';
import { requestOutputSchema } from '~/modules/current/request.router';
import { verifyOutputSchema } from '~/modules/current/verify.router';
import { NoWebLnModal } from '~/common/components/NoWebLnModal';
import { Invoice } from "alby-tools";
import { SystemPurposeData } from '~/modules/data/request.router';
import { staticGenerationAsyncStorage } from 'next/dist/client/components/static-generation-async-storage';



/// Text template helpers

const PromptTemplates = {
  Concatenate: '{{input}}\n\n{{text}}',
  PasteFile: '{{input}}\n\n```{{fileName}}\n{{fileText}}\n```\n',
  PasteMarkdown: '{{input}}\n\n```\n{{clipboard}}\n```\n',
};

const expandPromptTemplate = (template: string, dict: object) => (inputValue: string): string => {
  let expanded = template.replaceAll('{{input}}', (inputValue || '').trim()).trim();
  for (const [key, value] of Object.entries(dict))
    expanded = expanded.replaceAll(`{{${key}}}`, value.trim());
  return expanded;
};

export type SystemPurposeId = string;

export let defaultSystemPurposeId: any = '';

export let SystemPurposes: { [key in SystemPurposeId]: SystemPurposeData } = {

  OrangePill: {
    title: 'Orange Pill GPT',
    description: '',
    systemMessage: "How can individuals effectively promote Bitcoin adoption and understanding among their friends and family, especially beginners?",
    symbol: 'https://i.current.fyi/current/app/orangepill.png',
    examples: ['Explain bitcoin like I am 5 years old', 'How do you address the potential risks or downsides associated with Bitcoin?', 'What alternative approaches exist for educating others about Bitcoin? '],
    placeHolder: "The Orange-Pilling Agent is a skilled and empathetic advocate for Bitcoin adoption. With a deep understanding of the bitcoin space and a passion for spreading awareness about Bitcoin's potential, This uses ReAct approach of thought and reasoning and uses internet for real time search. ",
    chatLLM: 'llama-2-7b-chat-hf',
    llmRouter: 'nousresearch/nous-hermes-llama2-13b',
    convoCount: 5,
    maxToken: 512,
    temperature: 0.5,
    satsPay: 50,
    paid: false,
    chatruns: 55,
    newAgent: "false",
    nip05:'',
    category:'',
    createdBy:'',
    commissionAddress:'',
    restricted:false
  },

};


const attachFileLegend =
  <Stack sx={{ p: 1, gap: 1, fontSize: '16px', fontWeight: 400 }}>
    <Box sx={{ mb: 1, textAlign: 'center' }}>
      Attach a file to the message
    </Box>
    <table>
      <tbody>
      <tr>
        <td width={36}><PictureAsPdfIcon sx={{ width: 24, height: 24 }} /></td>
        <td><b>PDF</b></td>
        <td width={36} align='center' style={{ opacity: 0.5 }}>→</td>
        <td>📝 Text (split manually)</td>
      </tr>
      <tr>
        <td><DataArrayIcon sx={{ width: 24, height: 24 }} /></td>
        <td><b>Code</b></td>
        <td align='center' style={{ opacity: 0.5 }}>→</td>
        <td>📚 Markdown</td>
      </tr>
      <tr>
        <td><FormatAlignCenterIcon sx={{ width: 24, height: 24 }} /></td>
        <td><b>Text</b></td>
        <td align='center' style={{ opacity: 0.5 }}>→</td>
        <td>📝 As-is</td>
      </tr>
      </tbody>
    </table>
    <Box sx={{ mt: 1, fontSize: '14px' }}>
      Drag & drop in chat for faster loads ⚡
    </Box>
  </Stack>;

const pasteClipboardLegend =
  <Box sx={{ p: 1, fontSize: '14px', fontWeight: 400 }}>
    Converts Code and Tables to 📚 Markdown
  </Box>;


const MicButton = (props: { variant: VariantProp, color: ColorPaletteProp, onClick: () => void, sx?: SxProps }) =>
  <Tooltip title='CTRL + M' placement='top'>
    <IconButton variant={props.variant} color={props.color} onClick={props.onClick} sx={props.sx}>
      <MicIcon />
    </IconButton>
  </Tooltip>;


const SentMessagesMenu = (props: {
  anchorEl: HTMLAnchorElement, onClose: () => void,
  messages: { date: number; text: string; count: number }[],
  onPaste: (text: string) => void,
  onClear: () => void,
}) =>
  <Menu
    variant='plain' color='neutral' size='md' placement='top-end' sx={{ minWidth: 320, maxWidth: '100dvw', maxHeight: 'calc(100dvh - 56px)', overflowY: 'auto' }}
    open={!!props.anchorEl} anchorEl={props.anchorEl} onClose={props.onClose}>

    <MenuItem color='neutral' selected>Reuse messages 💬</MenuItem>

    <ListDivider />

    {props.messages.map((item, index) =>
      <MenuItem
        key={'composer-sent-' + index}
        onClick={() => { props.onPaste(item.text); props.onClose(); }}
        sx={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline', overflow: 'hidden' }}
      >
        {item.count > 1 && <span style={{ marginRight: 1 }}>({item.count})</span>} {item.text?.length > 70 ? item.text.slice(0, 68) + '...' : item.text}
      </MenuItem>)}

    <ListDivider />

    <MenuItem onClick={props.onClear}>
      <ListItemDecorator><DeleteOutlineIcon /></ListItemDecorator>
      Clear sent messages history
    </MenuItem>

  </Menu>;


/**
 * A React component for composing and sending messages in a chat-like interface.
 * Supports pasting text and code from the clipboard, and a local log of sent messages.
 *
 * Note: Useful bash trick to generate code from a list of files:
 *       $ for F in *.ts; do echo; echo "\`\`\`$F"; cat $F; echo; echo "\`\`\`"; done | clip
 *
 * @param {boolean} props.disableSend - Flag to disable the send button.
 * @param {(text: string, conversationId: string | null) => void} props.sendMessage - Function to send the message. conversationId is null for the Active conversation
 * @param {() => void} props.stopGeneration - Function to stop response generation
 */
export function Composer(props: {
  conversationId: string | null; messageId: string | null;
  systemPurpose: SystemPurposeId | null;
  onSendMessage: (sendModeId: SendModeId, conversationId: string, text: string) => void;
  sx?: SxProps;
}) {
  // state
  const [composeText, setComposeText] = React.useState('');
  const [agentsData, setAgentsData] = React.useState('');
  const [sendModeId, setSendModeId] = React.useState<SendModeId>('immediate');
  const [isDragging, setIsDragging] = React.useState(false);
  const [reducerText, setReducerText] = React.useState('');
  const [reducerTextTokens, setReducerTextTokens] = React.useState(0);
  const [sendModeMenuAnchor, setSendModeMenuAnchor] = React.useState<HTMLAnchorElement | null>(null);
  const [sentMessagesAnchor, setSentMessagesAnchor] = React.useState<HTMLAnchorElement | null>(null);
  const [confirmClearSent, setConfirmClearSent] = React.useState(false);
  const [openNoWebLnModal, setOpenNoWebLnModal] = React.useState(false);
  const attachmentFileInputRef = React.useRef<HTMLInputElement>(null);
  const [qrCodeText, setQrCodeText] = React.useState('');

  const appFingerPrint = localStorage.getItem('appFingerPrint');

  // external state
  const theme = useTheme();
  const enterToSend = useUIPreferencesStore(state => state.enterToSend);

  const {agentUpdate, setAgentUpdate} = useUIPreferencesStore(state => ({agentUpdate: state.agentUpdate, setAgentUpdate: state.setAgentUpdate,}));

  const { sentMessages, appendSentMessage, clearSentMessages, startupText, setStartupText } = useComposerStore();
  const { assistantTyping, tokenCount: conversationTokenCount, stopTyping, setTokenCount, setConversationCount, conversationCount } = useChatStore(state => {
  const conversation = state.conversations.find(conversation => conversation.id === props.conversationId);
    return {
      assistantTyping: conversation ? !!conversation.abortController : false,
      tokenCount: conversation ? conversation.tokenCount : 0,
      stopTyping: state.stopTyping,  
      setTokenCount: state.setTokenCount,
      conversationCount: conversation ? conversation.conversationCount : 0,
      setConversationCount: state.setConversationCount
    };
  }, shallow);
  const { chatLLMId, chatLLM } = useChatLLM();

  const agentData = React.useCallback(async () => {
    const response =  await fetch('/api/data/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({fingerPrint: appFingerPrint?appFingerPrint:''})
    })
    try {

      const jsonData = await response.json();
      console.log(jsonData);
      SystemPurposes = jsonData.SystemPurposes;
      setAgentUpdate(0)
      return SystemPurposes
      
    } catch (error) {
      console.log(error)
    }

   

    
    

  }, [appFingerPrint, setAgentUpdate]);

    
  
    
  

 

  // Effect: load initial text if queued up (e.g. by /share)
  React.useEffect(() => {
    if (agentUpdate !== 0) {
      agentData()
      

    }
    
    if (startupText) {   
      setStartupText(null);
      setComposeText(startupText);
    }

  }, [startupText, setStartupText, agentData, agentUpdate, setAgentUpdate]);

  // derived state
  const tokenLimit = chatLLM?.contextTokens || 0;
  const directTokens = React.useMemo(() => {
    return (!composeText || !chatLLMId) ? 4 : 4 + countModelTokens(composeText, chatLLMId, 'composer text');
  }, [chatLLMId, composeText]);
  const historyTokens = conversationTokenCount;
  const responseTokens = chatLLM?.options?.llmResponseTokens || 0;
  const remainingTokens = tokenLimit - directTokens - historyTokens - responseTokens;
  //console.log('props.systemPurpose: ',props.systemPurpose)
  const purposeTitle: string = SystemPurposes[props.systemPurpose as SystemPurposeId]?.title?SystemPurposes[props.systemPurpose as SystemPurposeId].title:''
  const paySats: number = purposeTitle==='Gen Image AI (Sats) '?100000:purposeTitle==='Youtube Chat (Sats)'?100000:Math.round(Math.floor(chatLLM?.id.startsWith('openai-gpt-4')?(responseTokens+directTokens)*200:(responseTokens+directTokens)*50)/ 1000) * 1000;
  const purposeModel: string = SystemPurposes[props.systemPurpose as SystemPurposeId]?.chatLLM?SystemPurposes[props.systemPurpose as SystemPurposeId].chatLLM:'';

  const handleSendClicked = () => {
    const text = (composeText || '').trim();
    console.log('inside handle clicked')
    console.log('Sats to be paid: %o', paySats);
    console.log('purpose Model: %o', purposeModel)
    console.log('conversationTokenCount: %o',conversationTokenCount)
    if ( conversationCount <  SystemPurposes[props.systemPurpose as SystemPurposeId].convoCount && !SystemPurposes[props.systemPurpose as SystemPurposeId].paid ) {
      if (text.length && props.conversationId) {
        setComposeText('');
        setConversationCount(props.conversationId, conversationCount + 1);
        props.onSendMessage(sendModeId, props.conversationId, text);

        appendSentMessage(text);
      }

    } else {

      Wallet_Service.getWebln()
            .then(async webln => {

                const response = await fetch('/api/current/request', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({'amtinsats': SystemPurposes[props.systemPurpose as SystemPurposeId].satsPay*1000,
                                          'nip05': SystemPurposes[props.systemPurpose as SystemPurposeId].nip05?SystemPurposes[props.systemPurpose as SystemPurposeId].nip05:'plebai@getcurrent.io' })
                });
                const payResponse  = await response.json();
                const { pr, verify } = requestOutputSchema.parse(payResponse);
                if (!webln) {
                    console.log('no webln detected')
                    setQrCodeText(pr);
                    setOpenNoWebLnModal(true);
                    let settle=false;
                    let count=0;
                    do {
                      count++;
                      const verifyResponse = await fetch('/api/current/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({'verifyUrl': verify })
                      });
                      const verifyResponseParsed  = await verifyResponse.json();
                      const { preimage, settled } = verifyOutputSchema.parse(verifyResponseParsed);
                      console.log('preimage from verify url: %o', preimage)
                      
                      if (text.length && props.conversationId && settled) {
                        setComposeText('');
                        props.onSendMessage(sendModeId, props.conversationId, text);
                        appendSentMessage(text);
                        setOpenNoWebLnModal(false);
                        settle=true;
                      }
                      if (count>180) settle=true;
                      console.log(count);

                    } while (!settle)  
                    
                } else {
                  try {

                    console.log('webln found')
                    
                    
                    
                    
                    const weblnResponse = await webln.sendPayment(pr);
                    let settle=false;
                    if (weblnResponse) {

                        do {

                          console.log('Payment Response: %o', weblnResponse.preimage)
                          const invoice = new Invoice({pr: pr, preimage: weblnResponse.preimage});
                          settle = await invoice.isPaid();

                          if (text.length && props.conversationId && settle) {
                            setConversationCount(props.conversationId, 1);
                            console.log('tokenCount: ', props.conversationId)
        
                            setComposeText('');
                      
                            props.onSendMessage(sendModeId, props.conversationId, text);
                            appendSentMessage(text);
                          }

                        } while (!settle)
                        
                    }
                  

                    
                  } catch (error) {

                    console.log('webln catch: %o', error)
                    //setOpenNoWebLnModal(true);
                    
                  }
                  


                }
                

              })


    }
    

    
  };

  const handleShowSendMode = (event: React.MouseEvent<HTMLAnchorElement>) => setSendModeMenuAnchor(event.currentTarget);

  const handleHideSendMode = () => setSendModeMenuAnchor(null);

  const handleStopClicked = () => props.conversationId && stopTyping(props.conversationId);

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const shiftOrAlt = e.shiftKey || e.altKey;
      if (enterToSend ? !shiftOrAlt : shiftOrAlt) {
        if (!assistantTyping)
          handleSendClicked();
        e.preventDefault();
      }
    }
  };


  const onSpeechResultCallback = React.useCallback((transcript: string) => {
    setComposeText(current => {
      current = current.trim();
      transcript = transcript.trim();
      if ((!current || current.endsWith('.') || current.endsWith('!') || current.endsWith('?')) && transcript.length)
        transcript = transcript[0].toUpperCase() + transcript.slice(1);
      return current ? current + ' ' + transcript : transcript;
    });
  }, []);

  const { isSpeechEnabled, isSpeechError, isRecordingAudio, isRecordingSpeech, toggleRecording } = useSpeechRecognition(onSpeechResultCallback, 'm');

  const handleMicClicked = () => toggleRecording();

  const micColor = isSpeechError ? 'danger' : isRecordingSpeech ? 'warning' : isRecordingAudio ? 'warning' : 'neutral';
  const micVariant = isRecordingSpeech ? 'solid' : isRecordingAudio ? 'solid' : 'plain';

  async function loadAndAttachFiles(files: FileList, overrideFileNames: string[]) {

    // NOTE: we tried to get the common 'root prefix' of the files here, so that we could attach files with a name that's relative
    //       to the common root, but the files[].webkitRelativePath property is not providing that information

    // perform loading and expansion
    let newText = '';
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = overrideFileNames.length === files.length ? overrideFileNames[i] : file.name;
      let fileText = '';
      try {
        if (file.type === 'application/pdf')
          fileText = await pdfToText(file);
        else
          fileText = await file.text();
        newText = expandPromptTemplate(PromptTemplates.PasteFile, { fileName: fileName, fileText })(newText);
      } catch (error) {
        // show errors in the prompt box itself - FUTURE: show in a toast
        console.error(error);
        newText = `${newText}\n\nError loading file ${fileName}: ${error}\n`;
      }
    }

    // see how we fare on budget
    if (chatLLMId) {
      const newTextTokens = countModelTokens(newText, chatLLMId, 'reducer trigger');

      // simple trigger for the reduction dialog
      if (newTextTokens > remainingTokens) {
        setReducerTextTokens(newTextTokens);
        setReducerText(newText);
        return;
      }
    }

    // within the budget, so just append
    setComposeText(text => expandPromptTemplate(PromptTemplates.Concatenate, { text: newText })(text));
  }

  const handleContentReducerClose = () => {
    setReducerText('');
  };

  const handleContentReducerText = (newText: string) => {
    handleContentReducerClose();
    setComposeText(text => text + newText);
  };

  const handleShowFilePicker = () => attachmentFileInputRef.current?.click();

  const handleLoadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (files && files.length >= 1)
      await loadAndAttachFiles(files, []);

    // this is needed to allow the same file to be selected again
    e.target.value = '';
  };

  


  const handlePasteButtonClicked = async () => {
    for (const clipboardItem of await navigator.clipboard.read()) {

      // when pasting html, only process tables as markdown (e.g. from Excel), or fallback to text
      try {
        const htmlItem = await clipboardItem.getType('text/html');
        const htmlString = await htmlItem.text();
        // paste tables as markdown
        if (htmlString.indexOf('<table') == 0) {
          const markdownString = htmlTableToMarkdown(htmlString);
          setComposeText(expandPromptTemplate(PromptTemplates.PasteMarkdown, { clipboard: markdownString }));
          continue;
        }
        // TODO: paste html to markdown (tried Turndown, but the gfm plugin is not good - need to find another lib with minimal footprint)
      } catch (error) {
        // ignore missing html: fallback to text/plain
      }

      // find the text/plain item if any
      try {
        const textItem = await clipboardItem.getType('text/plain');
        const textString = await textItem.text();
        setComposeText(expandPromptTemplate(PromptTemplates.PasteMarkdown, { clipboard: textString }));
        continue;
      } catch (error) {
        // ignore missing text
      }

      // no text/html or text/plain item found
      console.log('Clipboard item has no text/html or text/plain item.', clipboardItem.types, clipboardItem);
    }
  };

  const handleTextareaCtrlV = async (e: React.ClipboardEvent) => {

    // paste local files
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      await loadAndAttachFiles(e.clipboardData.files, []);
      return;
    }

    // paste not intercepted, continue with default behavior
  };


  const showSentMessages = (event: React.MouseEvent<HTMLAnchorElement>) => setSentMessagesAnchor(event.currentTarget);

  const hideSentMessages = () => setSentMessagesAnchor(null);

  const handlePasteSent = (text: string) => setComposeText(text);

  const handleClearSent = () => setConfirmClearSent(true);

  const handleCancelClearSent = () => setConfirmClearSent(false);

  const handleNoWeblnClose = () => setOpenNoWebLnModal(false);

  const handleConfirmedClearSent = () => {
    setConfirmClearSent(false);
    clearSentMessages();
  };


  const eatDragEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTextareaDragEnter = (e: React.DragEvent) => {
    eatDragEvent(e);
    setIsDragging(true);
  };

  const handleOverlayDragLeave = (e: React.DragEvent) => {
    eatDragEvent(e);
    setIsDragging(false);
  };

  const handleOverlayDragOver = (e: React.DragEvent) => {
    eatDragEvent(e);
    // e.dataTransfer.dropEffect = 'copy';
  };

  const handleOverlayDrop = async (e: React.DragEvent) => {
    eatDragEvent(e);
    setIsDragging(false);

    // dropped files
    if (e.dataTransfer.files?.length >= 1) {
      // Workaround: as we don't have the full path in the File object, we need to get it from the text/plain data
      let overrideFileNames: string[] = [];
      if (e.dataTransfer.types?.includes('text/plain')) {
        const plainText = e.dataTransfer.getData('text/plain');
        overrideFileNames = extractFilePathsWithCommonRadix(plainText);
      }
      return loadAndAttachFiles(e.dataTransfer.files, overrideFileNames);
    }

    // special case: detect failure of dropping from VSCode
    // VSCode: Drag & Drop does not transfer the File object: https://github.com/microsoft/vscode/issues/98629#issuecomment-634475572
    if (e.dataTransfer.types?.includes('codeeditors'))
      return setComposeText(test => test + 'Pasting from VSCode is not supported! Fixme. Anyone?');

    // dropped text
    const droppedText = e.dataTransfer.getData('text');
    if (droppedText?.length >= 1)
      return setComposeText(text => expandPromptTemplate(PromptTemplates.PasteMarkdown, { clipboard: droppedText })(text));

    // future info for dropping
    console.log('Unhandled Drop event. Contents: ', e.dataTransfer.types.map(t => `${t}: ${e.dataTransfer.getData(t)}`));
  };

  // const prodiaApiKey = isValidProdiaApiKey(useSettingsStore(state => state.prodiaApiKey));
  // const isProdiaConfigured = !requireUserKeyProdia || prodiaApiKey; 
  const textPlaceholder: string = SystemPurposes[props.systemPurpose as SystemPurposeId]?.placeHolder?SystemPurposes[props.systemPurpose as SystemPurposeId].placeHolder:'';
    
  const isReAct = sendModeId === 'react';

  return (
    <Box sx={props.sx}>
      <Grid container spacing={{ xs: 1, md: 2 }}>

        {/* Left pane (buttons and Textarea) */}
        <Grid xs={12} md={10}><Stack direction='row' spacing={{ xs: 1, md: 0, mb: 2 }}>

          {/* Vertical Buttons Bar */}
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: { xs: 0, md: 0 } }}>

            {/*<Typography level='body3' sx={{mb: 2}}>Context</Typography>*/}

            {isSpeechEnabled && <Box sx={hideOnDesktop}>
              <MicButton variant={micVariant} color={micColor} onClick={handleMicClicked} />
            </Box>}
            {/* 
            <IconButton variant='soft' color='neutral' onClick={handleShowFilePicker} sx={{ ...hideOnDesktop }}>
              <UploadFileIcon />
            </IconButton>
            <Tooltip
              variant='soft' placement='top-start'
              title={attachFileLegend}>
              <Button variant='plain' color='neutral' onClick={handleShowFilePicker} startDecorator={<UploadFileIcon />}
                      sx={{ ...hideOnMobile, justifyContent: 'flex-start' }}>
               
              </Button>
            </Tooltip>

            <IconButton variant='soft' color='neutral' onClick={handlePasteButtonClicked} sx={{ ...hideOnDesktop }}>
              <ContentPasteGoIcon />
            </IconButton>
            <Tooltip
              variant='soft' placement='top-start'
              title={pasteClipboardLegend}>
              <Button fullWidth variant='plain' color='neutral' startDecorator={<ContentPasteGoIcon />} onClick={handlePasteButtonClicked}
                      sx={{ ...hideOnMobile, justifyContent: 'flex-start' }}>
              
              </Button>
            </Tooltip>
            */}
            <input type='file' multiple hidden ref={attachmentFileInputRef} onChange={handleLoadAttachment} />

          </Box>

          <Grid xs={1} md={2}>
          <Stack spacing={2}>

            <Box sx={{ display: 'flex', flexDirection: 'row' }}>

              {/* [mobile-only] Sent messages arrow */}
              {sentMessages.length > 0 && (
                <IconButton disabled={!!sentMessagesAnchor} variant='plain' color='neutral' onClick={showSentMessages} sx={{ ...hideOnDesktop, mr: { xs: 1, md: 2 } }}>
                  <HistoryIcon />
                </IconButton>
              )}

              {/* Send / Stop */}
             
                            {/* [desktop-only] row with Sent Messages button */}
                <Stack direction='row' spacing={1} sx={{ ...hideOnMobile, flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'flex-end' }}>
                  {sentMessages.length > 0 && (
                    <Button disabled={!!sentMessagesAnchor} variant='plain' color='neutral' startDecorator={<HistoryIcon />} onClick={showSentMessages}>
                      
                    </Button>
                  )}
                </Stack>
            </Box>



          </Stack>
        </Grid>

          {/* Edit box, with Drop overlay */}
          <Box sx={{ flexGrow: 2, position: 'relative' }}>

            <Box sx={{ position: 'relative' }}>

              <Textarea
                variant='outlined' color={isReAct ? 'neutral' : 'neutral'}
                autoFocus
                minRows={1} maxRows={12}
                placeholder={"Type a text or image prompt for " + purposeTitle}
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onDragEnter={handleTextareaDragEnter}
                onKeyDown={handleTextareaKeyDown}
                onPasteCapture={handleTextareaCtrlV}
                slotProps={{
                  textarea: {
                    enterKeyHint: enterToSend ? 'send' : 'enter',
                    sx: {
                      ...(isSpeechEnabled ? { pr: { md: 5 } } : {}),
                      mb: 0.5,
                    },
                  },
                }}
                sx={{
                  '&::before': {
                    outline: '0.5px solid var(--Textarea-focusedHighlight)',
                  },
                  background: theme.vars.palette.background.level2,
                  fontSize: '16px',
                  lineHeight: 1.75,
                }} />
                {/*
              {tokenLimit > 0 && (directTokens > 0 || (historyTokens + responseTokens) > 0) && <TokenProgressbar history={historyTokens} response={responseTokens} direct={directTokens} limit={tokenLimit} />}
              */}
            </Box>

            {assistantTyping
                ? (
                  <Button
                    variant='soft' color={isReAct ? 'primary' : 'neutral'} disabled={!props.conversationId}
                    onClick={handleStopClicked}
                    endDecorator={<StopOutlinedIcon />}
                    sx={{ position: 'absolute', top: 0, right: 0, margin: 1, mb: 0.5 }}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant='plain' color={isReAct ? 'primary' : 'neutral'} disabled={!props.conversationId || !chatLLM}
                    onClick={handleSendClicked}  
                    endDecorator={isReAct ? <PsychologyIcon /> : <SendIcon />}
                    sx={{ position: 'absolute', top: 0, right: 0, margin: 1 }}
                  >
                    {isReAct ? 'ReAct' : ''}
                  </Button>
                )}


            {/* isSpeechEnabled && <MicButton variant={micVariant} color={micColor} onClick={handleMicClicked} sx={{ ...hideOnMobile, position: 'absolute', top: 0, right: 0, margin: 1 }} />} */}

            {/* {!!tokenLimit && <TokenBadge directTokens={directTokens} indirectTokens={historyTokens + responseTokens} tokenLimit={tokenLimit} absoluteBottomRight />} */}

            <Card
              color='neutral' invertedColors variant='soft'
              sx={{
                display: isDragging ? 'flex' : 'none',
                position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
                alignItems: 'center', justifyContent: 'space-evenly',
                border: '2px dashed',
                zIndex: 10,
              }}
              onDragLeave={handleOverlayDragLeave}
              onDragOver={handleOverlayDragOver}
              onDrop={handleOverlayDrop}>
              <PanToolIcon sx={{ width: 40, height: 40, pointerEvents: 'none' }} />
              <Typography level='body-sm' sx={{ pointerEvents: 'none' }}>
                I will hold on to this for you
              </Typography>
            </Card>

          </Box>

        </Stack></Grid>

        {/* Send pane */}



        {/* Mode selector */}
        {!!sendModeMenuAnchor && (
          <SendModeMenu anchorEl={sendModeMenuAnchor} sendMode={sendModeId} onSetSendMode={setSendModeId} onClose={handleHideSendMode} />
        )}

        {/* Sent messages menu */}
        {!!sentMessagesAnchor && (
          <SentMessagesMenu
            anchorEl={sentMessagesAnchor} messages={sentMessages} onClose={hideSentMessages}
            onPaste={handlePasteSent} onClear={handleClearSent}
          />
        )}

        {/* Content reducer modal */}
        {reducerText?.length >= 1 &&
          <ContentReducer
            initialText={reducerText} initialTokens={reducerTextTokens} tokenLimit={remainingTokens}
            onReducedText={handleContentReducerText} onClose={handleContentReducerClose}
          />
        }

        {/* Clear confirmation modal */}
        <ConfirmationModal
          open={confirmClearSent} onClose={handleCancelClearSent} onPositive={handleConfirmedClearSent}
          confirmationText={'Are you sure you want to clear all your sent messages?'} positiveActionText={'Clear all'}
        />

        <NoWebLnModal
          open={openNoWebLnModal} onClose={handleNoWeblnClose}  qrText= {qrCodeText}
          
        />

      </Grid>
    </Box>
  );
}

