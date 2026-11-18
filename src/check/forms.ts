// What we know about each standard Winlink form, learned from real files (rule 3).
// Field names are facts from our own samples; no template file is copied (rule 2).
// Sources: ICS-213 v.43.8 in Winlink Express 1.8.6.0 and Pat v0.19.2 (2026-11-16); the other forms
// from Save Data files saved in WE 1.8.6.3 during ETO exercises (shared by a tester, 2026-11-17).
// Newer Hospital Status and Field Situation versions, and the parseme finding, from Pat 1.0.1 saves
// with Standard Forms 1.1.22.0 (test/samples/pat, 2026-11-17). Forms known only from Save Data have
// no viewer fields yet.

export interface FormSpec {
  /** Short id, e.g. 'ICS-213'. */
  id: string;
  /** `display_form` in the viewer XML. */
  displayForm?: string;
  /**
   * Map file name, exactly as saved (Save Data key `mapfilename`, `MapFileName` or `Mapfilename`
   * depending on the form; FormData.txt `MapFileName:T=`). Some forms save none.
   */
  mapFileName?: string;
  /** Template versions we have real samples from. Others get a warning, not an error. */
  templateVersions: string[];
  /** Keys in the template's Save Data JSON, case as written (the first template version's). */
  saveDataKeys: string[];
  /** Save Data keys for other template versions whose fields differ. */
  saveDataKeysByVersion?: Record<string, string[]>;
  /** Form variables in the viewer XML (lower-case), not counting the client's msg* variables. */
  viewerVariables?: string[];
}

/**
 * Save Data keys a file may leave out. `parseme` is the hidden box Load Data reads the file into;
 * templates changed on 2026-09-25 stopped saving it (so a save no longer nests the previous one),
 * without changing their version string: WE 1.8.6.3 saves from before then have it, Pat 1.0.1
 * saves of the 213RR, 214, 205, HICS-251, Hospital Status 2.3 and Field Situation 0.2.10 don't.
 */
export const OPTIONAL_SAVE_DATA_KEYS = ['parseme'];

/** The Save Data keys for one template version (falls back to the form's main list). */
export function saveDataKeysFor(form: FormSpec, version: unknown): string[] {
  return (typeof version === 'string' && form.saveDataKeysByVersion?.[version]) || form.saveDataKeys;
}

/** Variables every client writes into the viewer XML (WE 1.8.6.0 and Pat 0.19.2). */
export const CLIENT_VARIABLES = [
  'msgto', 'msgcc', 'msgsender', 'msgsubject', 'msgbody', 'msgp2p', 'msgisreply', 'msgisforward',
  'msgisacknowledgement', 'msgseqnum',
];

/** Variables only some clients write: WE adds these, Pat doesn't. */
export const OPTIONAL_CLIENT_VARIABLES = ['name', 'msgro', 'msgpostoffice'];

export const FORMS: FormSpec[] = [
  {
    id: 'ICS-213',
    displayForm: 'ICS213_Initial_Viewer.html',
    mapFileName: 'ICS-213',
    templateVersions: ['ICS 213  v.43.8'],
    saveDataKeys: [
      'ShowDR', 'exbtn', 'IsExercise', 'FormTitle', 'txtfiletoread', 'inc_name', 'to_name', 'txtStr', 'fm_name',
      'Subjectline', 'Mdate', 'Mtime', 'timestamp', 'timestamp2', 'attached_file', 'mapfilename', 'Message',
      'Message2', 'FormData', 'attached_text', 'Approved_Name', 'Approved_PosTitle', 'GPS', 'mapLat', 'mapLon',
      'MGRS', 'Grid', 'GPS2', 'GPSc', 'ExtGPS', 'WithSpaces', 'NoSpaces', 'addformat', 'locationSource',
      'location_source', 'ResetForm', 'testCall', 'parseme', 'theMsgSender', 'Templateversion',
    ],
    viewerVariables: [
      'showdr', 'exbtn', 'isexercise', 'formtitle', 'inc_name', 'to_name', 'txtstr', 'fm_name', 'subjectline',
      'mdate', 'mtime', 'timestamp', 'timestamp2', 'mapfilename', 'message', 'message2', 'formdata',
      'approved_name', 'approved_postitle', 'gps', 'maplat', 'maplon', 'mgrs', 'grid', 'gps2', 'gpsc', 'extgps',
      'withspaces', 'nospaces', 'addformat', 'locationsource', 'location_source', 'submit', 'testcall', 'parseme',
      'themsgsender', 'templateversion',
    ],
  },
  {
    id: 'ICS-213RR',
    displayForm: 'ICS213RR_Viewer.html',
    templateVersions: ['ICS 213RR v. 14.6'],
    saveDataKeys: [
      'IncName', 'ActivityDateTime1', 'txtfiletoread', 'parseme', 'FormTitle', 'ReqNum', 'Qty1', 'Kind1', 'Type1',
      'Item1', 'ReqDateTime1', 'EstDateTime1', 'Cost1', 'Qty2', 'Kind2', 'Type2', 'Item2', 'ReqDateTime2',
      'EstDateTime2', 'Cost2', 'Qty3', 'Kind3', 'Type3', 'Item3', 'ReqDateTime3', 'EstDateTime3', 'Cost3', 'Qty4',
      'Kind4', 'Type4', 'Item4', 'ReqDateTime4', 'EstDateTime4', 'Cost4', 'Qty5', 'Kind5', 'Type5', 'Item5',
      'ReqDateTime5', 'EstDateTime5', 'Cost5', 'Qty6', 'Kind6', 'Type6', 'Item6', 'ReqDateTime6', 'EstDateTime6',
      'Cost6', 'Qty7', 'Kind7', 'Type7', 'Item7', 'ReqDateTime7', 'EstDateTime7', 'Cost7', 'Qty8', 'Kind8',
      'Type8', 'Item8', 'ReqDateTime8', 'EstDateTime8', 'Cost8', 'Delivery', 'Subs1', 'ReqName', 'Priority',
      'SecApp', 'LogNum', 'SupInfo', 'SupName', 'POC', 'Notes', 'AuthSig', 'ActivityDateTime2', 'OrderBy',
      'FinComm', 'FinRepName', 'ActivityDateTime3', 'ResetForm', 'Templateversion', 'testCall',
    ],
    // Pat 1.0.1 viewer XML, template ICS 213RR v. 14.6 (test/samples/pat).
    viewerVariables: [
      'activitydatetime1', 'activitydatetime2', 'activitydatetime3', 'authsig', 'cost1', 'cost2', 'cost3',
      'cost4', 'cost5', 'cost6', 'cost7', 'cost8', 'delivery', 'estdatetime1', 'estdatetime2', 'estdatetime3',
      'estdatetime4', 'estdatetime5', 'estdatetime6', 'estdatetime7', 'estdatetime8', 'fincomm', 'finrepname',
      'formtitle', 'incname', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'kind1',
      'kind2', 'kind3', 'kind4', 'kind5', 'kind6', 'kind7', 'kind8', 'lognum', 'notes', 'orderby', 'parseme',
      'poc', 'priority', 'qty1', 'qty2', 'qty3', 'qty4', 'qty5', 'qty6', 'qty7', 'qty8', 'reqdatetime1',
      'reqdatetime2', 'reqdatetime3', 'reqdatetime4', 'reqdatetime5', 'reqdatetime6', 'reqdatetime7',
      'reqdatetime8', 'reqname', 'reqnum', 'secapp', 'submit', 'subs1', 'supinfo', 'supname', 'templateversion',
      'testcall', 'txtstr', 'type1', 'type2', 'type3', 'type4', 'type5', 'type6', 'type7', 'type8',
    ],
  },
  {
    id: 'ICS-214',
    displayForm: 'ICS214_Viewer.html',
    templateVersions: ['ICS 214 v 17.10'],
    saveDataKeys: [
      'parseme2', 'txtfiletoread', 'Incident_Name', 'Page', 'FormTitle', 'DateTimeFrom', 'DateTimeTo', 'Name',
      'ICS_Position', 'parseme', 'Home_Agency', 'Name1', 'ICS_Position1', 'Home_Agency1', 'Name2',
      'ICS_Position2', 'Home_Agency2', 'Name3', 'ICS_Position3', 'Home_Agency3', 'Name4', 'ICS_Position4',
      'Home_Agency4', 'Name5', 'ICS_Position5', 'Home_Agency5', 'Name6', 'ICS_Position6', 'Home_Agency6', 'Name7',
      'ICS_Position7', 'Home_Agency7', 'Name8', 'ICS_Position8', 'Home_Agency8', 'ActivityDateTime1',
      'Activities1', 'ActivityDateTime2', 'Activities2', 'ActivityDateTime3', 'Activities3', 'ActivityDateTime4',
      'Activities4', 'ActivityDateTime5', 'Activities5', 'ActivityDateTime6', 'Activities6', 'ActivityDateTime7',
      'Activities7', 'ActivityDateTime8', 'Activities8', 'ActivityDateTime9', 'Activities9', 'ActivityDateTime10',
      'Activities10', 'ActivityDateTime11', 'Activities11', 'ActivityDateTime12', 'Activities12',
      'ActivityDateTime13', 'Activities13', 'ActivityDateTime14', 'Activities14', 'ActivityDateTime15',
      'Activities15', 'ActivityDateTime16', 'Activities16', 'ActivityDateTime17', 'Activities17',
      'ActivityDateTime18', 'Activities18', 'ActivityDateTime19', 'Activities19', 'ActivityDateTime20',
      'Activities20', 'ActivityDateTime21', 'Activities21', 'ActivityDateTime22', 'Activities22',
      'ActivityDateTime23', 'Activities23', 'ActivityDateTime24', 'Activities24', 'PreparedName', 'ResetForm',
      'testCall', 'Templateversion',
    ],
    // Pat 1.0.1 viewer XML, template ICS 214 v 17.10 (test/samples/pat).
    viewerVariables: [
      'activities1', 'activities10', 'activities11', 'activities12', 'activities13', 'activities14',
      'activities15', 'activities16', 'activities17', 'activities18', 'activities19', 'activities2',
      'activities20', 'activities21', 'activities22', 'activities23', 'activities24', 'activities3',
      'activities4', 'activities5', 'activities6', 'activities7', 'activities8', 'activities9',
      'activitydatetime1', 'activitydatetime10', 'activitydatetime11', 'activitydatetime12', 'activitydatetime13',
      'activitydatetime14', 'activitydatetime15', 'activitydatetime16', 'activitydatetime17',
      'activitydatetime18', 'activitydatetime19', 'activitydatetime2', 'activitydatetime20', 'activitydatetime21',
      'activitydatetime22', 'activitydatetime23', 'activitydatetime24', 'activitydatetime3', 'activitydatetime4',
      'activitydatetime5', 'activitydatetime6', 'activitydatetime7', 'activitydatetime8', 'activitydatetime9',
      'datetimefrom', 'datetimeto', 'formtitle', 'home_agency', 'home_agency1', 'home_agency2', 'home_agency3',
      'home_agency4', 'home_agency5', 'home_agency6', 'home_agency7', 'home_agency8', 'ics_position',
      'ics_position1', 'ics_position2', 'ics_position3', 'ics_position4', 'ics_position5', 'ics_position6',
      'ics_position7', 'ics_position8', 'incident_name', 'name1', 'name2', 'name3', 'name4', 'name5', 'name6',
      'name7', 'name8', 'page', 'parseme', 'parseme2', 'preparedname', 'submit', 'templateversion', 'testcall',
      'txtstr',
    ],
  },
  {
    id: 'ICS-205',
    displayForm: 'ICS205 Radio Plan_Viewer.html',
    templateVersions: ['ICS205- v 19.5'],
    saveDataKeys: [
      'parseme', 'Incident_Name', 'FormTitle', 'ActivityDateTime2', 'DateFrom', 'DateTo', 'TimeFrom', 'TimeTo',
      'txtfiletoread', 'ZoneGrp1', 'Ch1', 'Function1', 'ChannelName1', 'Assignment1', 'RX1', 'NWMode1', 'RXTone1',
      'TX1', 'TNWMode1', 'TXTone1', 'Mode1', 'Remarks1', 'ZoneGrp2', 'Ch2', 'Function2', 'ChannelName2',
      'Assignment2', 'RX2', 'NWMode2', 'RXTone2', 'TX2', 'TNWMode2', 'TXTone2', 'Mode2', 'Remarks2', 'ZoneGrp3',
      'Ch3', 'Function3', 'ChannelName3', 'Assignment3', 'RX3', 'NWMode3', 'RXTone3', 'TX3', 'TNWMode3',
      'TXTone3', 'Mode3', 'Remarks3', 'ZoneGrp4', 'Ch4', 'Function4', 'ChannelName4', 'Assignment4', 'RX4',
      'NWMode4', 'RXTone4', 'TX4', 'TNWMode4', 'TXTone4', 'Mode4', 'Remarks4', 'ZoneGrp5', 'Ch5', 'Function5',
      'ChannelName5', 'Assignment5', 'RX5', 'NWMode5', 'RXTone5', 'TX5', 'TNWMode5', 'TXTone5', 'Mode5',
      'Remarks5', 'ZoneGrp6', 'Ch6', 'Function6', 'ChannelName6', 'Assignment6', 'RX6', 'NWMode6', 'RXTone6',
      'TX6', 'TNWMode6', 'TXTone6', 'Mode6', 'Remarks6', 'ZoneGrp7', 'Ch7', 'Function7', 'ChannelName7',
      'Assignment7', 'RX7', 'NWMode7', 'RXTone7', 'TX7', 'TNWMode7', 'TXTone7', 'Mode7', 'Remarks7', 'ZoneGrp8',
      'Ch8', 'Function8', 'ChannelName8', 'Assignment8', 'RX8', 'NWMode8', 'RXTone8', 'TX8', 'TNWMode8',
      'TXTone8', 'Mode8', 'Remarks8', 'ZoneGrp9', 'Ch9', 'Function9', 'ChannelName9', 'Assignment9', 'RX9',
      'NWMode9', 'RXTone9', 'TX9', 'TNWMode9', 'TXTone9', 'Mode9', 'Remarks9', 'ZoneGrp10', 'Ch10', 'Function10',
      'ChannelName10', 'Assignment10', 'RX10', 'NWMode10', 'RXTone10', 'TX10', 'TNWMode10', 'TXTone10', 'Mode10',
      'Remarks10', 'SpecialInstructions', 'PreparedName', 'ActivityDateTime1', 'IAP_Page', 'AddAttachment',
      'DoAttach', 'attached_file', 'attached_text', 'ResetForm', 'testCall', 'Templateversion',
    ],
    // Pat 1.0.1 viewer XML, template ICS205- v 19.5 (test/samples/pat).
    viewerVariables: [
      'activitydatetime1', 'activitydatetime2', 'addattachment', 'assignment1', 'assignment10', 'assignment2',
      'assignment3', 'assignment4', 'assignment5', 'assignment6', 'assignment7', 'assignment8', 'assignment9',
      'attached_file', 'attached_text', 'ch1', 'ch10', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9',
      'channelname1', 'channelname10', 'channelname2', 'channelname3', 'channelname4', 'channelname5',
      'channelname6', 'channelname7', 'channelname8', 'channelname9', 'datefrom', 'dateto', 'doattach',
      'formtitle', 'function1', 'function10', 'function2', 'function3', 'function4', 'function5', 'function6',
      'function7', 'function8', 'function9', 'iap_page', 'incident_name', 'mode1', 'mode10', 'mode2', 'mode3',
      'mode4', 'mode5', 'mode6', 'mode7', 'mode8', 'mode9', 'nwmode1', 'nwmode10', 'nwmode2', 'nwmode3',
      'nwmode4', 'nwmode5', 'nwmode6', 'nwmode7', 'nwmode8', 'nwmode9', 'parseme', 'preparedname', 'remarks1',
      'remarks10', 'remarks2', 'remarks3', 'remarks4', 'remarks5', 'remarks6', 'remarks7', 'remarks8', 'remarks9',
      'rx1', 'rx10', 'rx2', 'rx3', 'rx4', 'rx5', 'rx6', 'rx7', 'rx8', 'rx9', 'rxtone1', 'rxtone10', 'rxtone2',
      'rxtone3', 'rxtone4', 'rxtone5', 'rxtone6', 'rxtone7', 'rxtone8', 'rxtone9', 'specialinstructions',
      'submit', 'templateversion', 'testcall', 'timefrom', 'timeto', 'tnwmode1', 'tnwmode10', 'tnwmode2',
      'tnwmode3', 'tnwmode4', 'tnwmode5', 'tnwmode6', 'tnwmode7', 'tnwmode8', 'tnwmode9', 'tx1', 'tx10', 'tx2',
      'tx3', 'tx4', 'tx5', 'tx6', 'tx7', 'tx8', 'tx9', 'txtone1', 'txtone10', 'txtone2', 'txtone3', 'txtone4',
      'txtone5', 'txtone6', 'txtone7', 'txtone8', 'txtone9', 'txtstr', 'zonegrp1', 'zonegrp10', 'zonegrp2',
      'zonegrp3', 'zonegrp4', 'zonegrp5', 'zonegrp6', 'zonegrp7', 'zonegrp8', 'zonegrp9',
    ],
  },
  {
    id: 'HICS-251',
    displayForm: 'HICS 251 Facility Status Report_viewer.html',
    mapFileName: 'HICS-251 Facility Status Report ',
    templateVersions: ['HICS-251 v .6'],
    saveDataKeys: [
      'txtfiletoread', 'Incident_Name', 'Page', 'Page1', 'attached_file', 'attached_text', 'attached_file2',
      'attached_text2', 'OpNum', 'DateFrom', 'DateTo', 'TimeFrom', 'TimeTo', 'Department', 'Contactnumber',
      'StreetADDRESS', 'City', 'State', 'ZipCode', 'DMa', 'selecta', 'Commenta', 'DMb', 'selectb', 'Commentb',
      'DMc', 'selectc', 'Commentc', 'DMd', 'selectd', 'Commentd', 'DMe', 'selecte', 'Commente', 'DMf', 'selectf',
      'Commentf', 'DMg', 'selectg', 'Commentg', 'Remarks', 'PreparedName', 'DateTime', 'Facility', 'Operator',
      'mapLat', 'mapLon', 'MGRS', 'Grid', 'ExtGPS', 'GPS2', 'GPS', 'timestamp', 'timestamp2', 'MapFileName',
      'locationSource', 'location_source', 'AddAttachment', 'DoAttach', 'ResetForm', 'testCall',
      'Templateversion', 'FormData', 'w3w',
    ],
    // Pat 1.0.1 viewer XML, template HICS-251 v .6 (test/samples/pat).
    viewerVariables: [
      'addattachment', 'attached_file2', 'attached_text2', 'city', 'commenta', 'commentb', 'commentc', 'commentd',
      'commente', 'commentf', 'commentg', 'contactnumber', 'datefrom', 'datetime', 'dateto', 'department', 'dma',
      'dmb', 'dmc', 'dmd', 'dme', 'dmf', 'dmg', 'doattach', 'extgps', 'facility', 'formdata', 'gps', 'gps2',
      'grid', 'incident_name', 'location_source', 'locationsource', 'mapfilename', 'maplat', 'maplon', 'mgrs',
      'operator', 'opnum', 'page', 'page1', 'parseme', 'preparedname', 'remarks', 'selecta', 'selectb', 'selectc',
      'selectd', 'selecte', 'selectf', 'selectg', 'state', 'streetaddress', 'submit', 'templateversion',
      'testcall', 'timefrom', 'timestamp', 'timestamp2', 'timeto', 'txtstr', 'w3w', 'zipcode',
    ],
  },
  {
    id: 'Hospital Status',
    displayForm: 'Hospital_Status_Viewer.html',
    mapFileName: 'General Hospital Status',
    templateVersions: ['General Hospital Status 2.2', 'General Hospital Status 2.3'],
    saveDataKeys: [
      'txtfiletoread', 'Title', 'exbtn', 'IsExercise', 'RType', 'updatenum', 'aReportType', 'ExtGPS', 'GPS',
      'timestamp', 'timestamp2', 'attached_file', 'Mapfilename', 'attached_text', 'parseme', 'Incident1',
      'DateTime', 'FacilityName3a', 'Factype3b', 'Othertype', 'FacilType', 'mapLat', 'mapLon', 'MGRS', 'Grid',
      'GPS2', 'Contact4', 'Contactphone', 'phoneX', 'Cell4', 'Contactemail', 'FACILITY5', 'A5a', 'Comments5',
      'bcommipaired', 'commipaired', 'CommsEmail', 'A6a', 'CommsLL', 'A6b', 'CommsFax', 'A6c', 'CommsInternet',
      'A6d', 'CommsCell', 'A6e', 'Commssat', 'A6f', 'CommsHeart', 'A6g', 'Comments6', 'butilitiesimpared',
      'utilitiesimpared', 'Utilitiesa', 'A7a', 'Utilitiesb', 'A7b', 'Utilitiesc', 'A7c', 'Utilitiesd', 'A7d',
      'Comments7', 'bevacConcerns', 'evacConcerns', 'bEvac8', 'Evac8', 'b8a', 'A8a', 'bPartial8', 'Partial8',
      'b8b', 'A8b', 'bTotal8', 'Total8', 'b8c', 'A8c', 'bShelter8', 'Shelter8', 'b8d', 'A8d', 'Comments8',
      'bthereArecausalties', 'thereArecausalties', 'Immediate9', 'FormData', 'Delayed9', 'Minor9', 'Fatalities9',
      'Comments9', 'bplan10a', 'plan10a', 'bFCCActive10', 'FCCActive10', 'bgenerator10', 'generator10',
      'bResiourceRequest10', 'ResourceRreq10', 'Comments10', 'ResetForm', 'Templateversion', 'testCall',
    ],
    saveDataKeysByVersion: {
      'General Hospital Status 2.3': [
        'txtfiletoread', 'Title', 'exbtn', 'IsExercise', 'RType', 'updatenum', 'aReportType', 'ExtGPS', 'GPS',
        'timestamp', 'timestamp2', 'attached_file', 'Mapfilename', 'attached_text', 'Incident1', 'DateTime',
        'FacilityName3a', 'Factype3b', 'Othertype', 'FacilType', 'mapLat', 'mapLon', 'MGRS', 'Grid', 'GPS2',
        'locationSource', 'location_source', 'Contact4', 'Contactphone', 'phoneX', 'Cell4', 'Contactemail',
        'StreetADDRESS', 'City', 'State', 'ZipCode', 'FACILITY5', 'A5a', 'Comments5', 'bcommipaired',
        'commipaired', 'CommsEmail', 'A6a', 'CommsLL', 'A6b', 'CommsFax', 'A6c', 'CommsInternet', 'A6d',
        'CommsCell', 'A6e', 'Commssat', 'A6f', 'CommsHeart', 'A6g', 'Comments6', 'butilitiesimpared',
        'utilitiesimpared', 'Utilitiesa', 'A7a', 'Utilitiesb', 'A7b', 'Utilitiesc', 'A7c', 'Utilitiesd', 'A7d',
        'Comments7', 'bevacConcerns', 'evacConcerns', 'bEvac8', 'Evac8', 'b8a', 'A8a', 'bPartial8', 'Partial8',
        'b8b', 'A8b', 'bTotal8', 'Total8', 'b8c', 'A8c', 'bShelter8', 'Shelter8', 'b8d', 'A8d', 'Comments8',
        'bthereArecausalties', 'thereArecausalties', 'Immediate9', 'FormData', 'Delayed9', 'Minor9',
        'Fatalities9', 'Comments9', 'bplan10a', 'plan10a', 'bFCCActive10', 'FCCActive10', 'bgenerator10',
        'generator10', 'bResiourceRequest10', 'ResourceRreq10', 'Comments10', 'BtnAttachXML', 'AttachXML',
        'ResetForm', 'Templateversion', 'testCall',
      ],
    },
    // Pat 1.0.1 viewer XML, template General Hospital Status 2.3 (test/samples/pat).
    viewerVariables: [
      'a5a', 'a6a', 'a6b', 'a6c', 'a6d', 'a6e', 'a6f', 'a6g', 'a7a', 'a7b', 'a7c', 'a7d', 'a8a', 'a8b', 'a8c',
      'a8d', 'areporttype', 'attachxml', 'bcommipaired', 'bevac8', 'bevacconcerns', 'bfccactive10',
      'bgenerator10', 'bpartial8', 'bplan10a', 'bresiourcerequest10', 'bshelter8', 'btherearecausalties',
      'btotal8', 'butilitiesimpared', 'cell4', 'city', 'comments10', 'comments5', 'comments6', 'comments7',
      'comments8', 'comments9', 'commipaired', 'commscell', 'commsemail', 'commsfax', 'commsheart',
      'commsinternet', 'commsll', 'commssat', 'contact4', 'contactemail', 'contactphone', 'datetime', 'delayed9',
      'evac8', 'evacconcerns', 'exbtn', 'extgps', 'facility5', 'facilityname3a', 'faciltype', 'factype3b',
      'fatalities9', 'fccactive10', 'formdata', 'generator10', 'gps', 'gps2', 'grid', 'immediate9', 'incident1',
      'isexercise', 'location_source', 'locationsource', 'mapfilename', 'maplat', 'maplon', 'mgrs', 'minor9',
      'othertype', 'parseme', 'partial8', 'phonex', 'plan10a', 'resourcerreq10', 'rtype', 'shelter8', 'state',
      'streetaddress', 'submit', 'templateversion', 'testcall', 'therearecausalties', 'timestamp', 'timestamp2',
      'title', 'total8', 'txtstr', 'updatenum', 'utilitiesa', 'utilitiesb', 'utilitiesc', 'utilitiesd',
      'utilitiesimpared', 'zipcode',
    ],
  },
  {
    id: 'Field Situation',
    displayForm: 'Field Situation Report viewer.html',
    mapFileName: 'Field Situation Report',
    templateVersions: ['Field Situation Report V 0.1.5', 'Field Situation Report V 0.2.10'],
    saveDataKeys: [
      'FormData', 'Title', 'Precedence', 'UDTGfld', 'MsgNR', 'timestamp', 'timestamp2', 'MsgSender',
      'attached_file', 'MapFileName', 'parseme', 'txtfiletoread', 'MsgTo', 'MsgCc', 'Safetyneed', 'Comm0', 'City',
      'County', 'State', 'Territory', 'ExtGPS', 'GPS2', 'gpsLat', 'gpsLon', 'GPS', 'MGRS', 'Grid', 'Land',
      'Comm1', 'Cell', 'Comm2', 'AMFM', 'Comm3', 'TVStatus', 'Comm4', 'WaterWorks', 'Comm5', 'PowerWorks',
      'Comm6', 'Inter', 'Comm7', 'NOAA', 'NOAAcom', 'Message', 'attached_text', 'POC', 'k3', 'k4', 'k5', 'k6',
      'k7', 'k8', 'k9', 'k10', 'k11', 'k0', 'resetbtn', 'testCall', 'Templateversion',
    ],
    saveDataKeysByVersion: {
      'Field Situation Report V 0.2.10': [
        'FormData', 'Title', 'Precedence', 'UDTGfld', 'MsgNR', 'timestamp', 'timestamp2', 'MsgSender',
        'attached_file', 'MapFileName', 'txtfiletoread', 'MsgTo', 'MsgCc', 'Safetyneed', 'City', 'County',
        'State', 'Territory', 'ExtGPS', 'GPS2', 'gpsLat', 'gpsLon', 'GPS', 'MGRS', 'Grid', 'locationSource',
        'location_source', 'testlonfld', 'Comm0', 'POTS', 'Comm1', 'VOIP', 'Comm1A', 'Cell', 'Comm2', 'Celltext',
        'Comm2A', 'AMFM', 'Comm3', 'TVStatus', 'Comm4', 'TVStatusb', 'Comm4b', 'TVStatusc', 'Comm4c',
        'WaterWorks', 'Comm5', 'PowerWorks', 'Comm6', 'PowerStable', 'Comm6A', 'NatGas', 'Comm9c', 'Inter',
        'Comm7', 'NOAA', 'NOAAcom', 'NOAAb', 'NOAAcomb', 'Message', 'attached_text', 'POC', 'k3', 'k4', 'k4A',
        'k5', 'k5A', 'k6', 'k6A', 'k7', 'k7b', 'k7c', 'k8', 'k9', 'kgc9', 'k9A', 'k10', 'k11', 'k11b', 'k0',
        'resetbtn', 'testCall', 'Templateversion',
      ],
    },
    // Pat 1.0.1 viewer XML, template Field Situation Report V 0.2.10 (test/samples/pat).
    viewerVariables: [
      'amfm', 'cell', 'celltext', 'city', 'comm0', 'comm1', 'comm1a', 'comm2', 'comm2a', 'comm3', 'comm4',
      'comm4b', 'comm4c', 'comm5', 'comm6', 'comm6a', 'comm7', 'comm9c', 'county', 'extgps', 'formdata', 'gps',
      'gps2', 'gpslat', 'gpslon', 'grid', 'inter', 'k0', 'k10', 'k11', 'k11b', 'k3', 'k4', 'k4a', 'k5', 'k5a',
      'k6', 'k6a', 'k7', 'k7b', 'k7c', 'k8', 'k9', 'k9a', 'kgc9', 'location_source', 'locationsource',
      'mapfilename', 'message', 'mgrs', 'msgnr', 'natgas', 'noaa', 'noaab', 'noaacom', 'noaacomb', 'parseme',
      'poc', 'pots', 'powerstable', 'powerworks', 'precedence', 'safetyneed', 'state', 'submit',
      'templateversion', 'territory', 'testcall', 'testlonfld', 'timestamp', 'timestamp2', 'title', 'tvstatus',
      'tvstatusb', 'tvstatusc', 'txtstr', 'udtgfld', 'voip', 'waterworks',
    ],
  },
];

export function formByDisplayForm(displayForm: string): FormSpec | undefined {
  return FORMS.find((f) => f.displayForm?.toLowerCase() === displayForm.toLowerCase());
}

export function formByMapFileName(mapFileName: string): FormSpec | undefined {
  return FORMS.find((f) => f.mapFileName !== undefined && f.mapFileName.trim() === mapFileName.trim());
}

/**
 * The template name without its version, for matching a version not seen yet. Version strings
 * follow no single pattern: "ICS 213  v.43.8" -> "ICS 213", "HICS-251 v .6" -> "HICS-251",
 * "General Hospital Status 2.2" -> "General Hospital Status".
 */
export function templateStem(version: string): string {
  return version.trim().replace(/\s*(?:[vV][\s.]*)?[\d.]*\d$/, '');
}

/** The form a Save Data or viewer `Templateversion` belongs to: exact match first, then by stem. */
export function formByTemplateVersion(version: string): FormSpec | undefined {
  const exact = FORMS.find((f) => f.templateVersions.includes(version));
  if (exact) return exact;
  const stem = templateStem(version);
  return FORMS.find((f) => f.templateVersions.some((v) => templateStem(v) === stem));
}
