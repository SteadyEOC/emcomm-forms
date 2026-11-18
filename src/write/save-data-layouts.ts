// Generated from the public Pat 1.0.1 Save Data samples in test/samples/pat (Standard Forms 1.1.22.0,
// 2026-11-17). For each form: the template version written, whether the save includes `parseme`,
// the values the form fills in by itself (never the operator's), and which fields hold numbers.
// Field names and these values are facts from our own saves; no template file is copied (rule 2).

export interface SaveDataLayout {
  /** `Templateversion` the template writes. */
  templateVersion: string;
  /** Whether this version's save includes the hidden `parseme` box. */
  parseme: boolean;
  /** Values the form writes by itself; the writer sets these and refuses caller values for them. */
  fixed: Readonly<Record<string, string>>;
  /** Fields saved as numbers (checkbox state, 1 or 0); every other field is a string. */
  numbers: readonly string[];
}

/** The layout the writer produces for each form id, keyed by `FormSpec.id`. */
export const SAVE_DATA_LAYOUTS: Readonly<Record<string, SaveDataLayout>> = {
  "ICS-213": {
    templateVersion: "ICS 213  v.43.8",
    parseme: true,
    fixed: {
      attached_file: "FormData.txt",
      mapfilename: "ICS-213",
      FormData: "MapFileName:T=ICS-213\n0. Form Note:M=j0\nOrganization:T=j2\nDateTime:T=j3\nLatitude:T=j4 \nLongitude:T=j5\nMGRS:T=j9\nGrid:T=h10  \nLocation source:M:GPS,User specified,Form entry,Grid square,Address lookup=l6\nSender:T=j6              \n1. Incident Name:M=j7\n2. To (Name/Position):T=j8\n3. From:T=h9\n4. Subject:T=h11\n5. Date:T=jdate\n6. Time:T=h13\n7. Message:T=jmsg\n8. Approved by:T=jApproved_Name \n8b.Position / Title:T=jApproved_Pos",
      ResetForm: "Reset Form ",
    },
    numbers: ['exbtn'],
  },
  "ICS-213RR": {
    templateVersion: "ICS 213RR v. 14.6",
    parseme: false,
    fixed: {
      ResetForm: "Reset Form ",
    },
    numbers: [],
  },
  "ICS-214": {
    templateVersion: "ICS 214 v 17.10",
    parseme: true,
    fixed: {
      ResetForm: "Reset Form ",
    },
    numbers: [],
  },
  "ICS-205": {
    templateVersion: "ICS205- v 19.5",
    parseme: false,
    fixed: {
      ResetForm: "Reset Form ",
    },
    numbers: [],
  },
  "HICS-251": {
    templateVersion: "HICS-251 v .6",
    parseme: false,
    fixed: {
      attached_file: "FormData.txt",
      MapFileName: "HICS-251 Facility Status Report ",
      ResetForm: "Reset Form ",
      FormData: "MapFileName:T=j1\nDateTime:T=j2\nLatitude:T=j4\nLongitude:T=j5\nSender:T=j6\nMGRS:T=j9\nGrid:T=j10\nLocation source:M:GPS,User specified,Form entry,Grid square,Address lookup=l6\nOperator:T=Operatorname\n1. Incident Name:T=t1\n2. Operational Period:M=j11\n2a. Operational period from:T=je12\n2a. Operational period to:T=j13\n3. Department / Unit Reporting:T=j14\n3b. Department / Unit Contact number:T=j14a\n3c. Street Address:T=M1\n3d. City:T=M2\n3e. State:T=M3\n3f. Zip:T=M4\n4a. Power:M:Fully functional,Partially functional,Nonfunctional,N/A=j15\n4a. Power Comment:T=j15a\n4b. Lighting:M:Fully functional,Partially functional,Nonfunctional,N/A=j16\n4b. Lighting Comment:T=j16a\n4c. Water:M:Fully functional,Partially functional,Nonfunctional,N/A=j17\n4c. Water comment:T=j17a\n4d. Sewage/Toilets:M:Fully functional,Partially functional,Nonfunctional,N/A=j18\n4d. Sewage/Toilets comment:T=j18a\n4e. Nurse Call System:M:Fully functional,Partially functional,Nonfunctional,N/A=j19\n4e. Nurse Call System comment:T=j19a\n4f. Medical Gases / Oxygen:M:Fully functional,Partially functional,Nonfunctional,N/A=j20\n4f. Medical Gases  comment:T=j20a\n4g. Communications IT system, telephones, pagers:M:Fully functional,Partially functional,Nonfunctional,N/A=j21\n4g. Communications IT system comment:T=j21a\n7. Remarks:T=j30\n8a. Prepared by:T=j31\n8b. Prepared Time:T=j32\n8c. Facility:T=j33\n      ",
    },
    numbers: [],
  },
  "Hospital Status": {
    templateVersion: "General Hospital Status 2.3",
    parseme: false,
    fixed: {
      attached_file: "FormData.txt",
      Mapfilename: "General Hospital Status",
      FormData: "MapFileName:T=General Hospital Status\nDateTime:T=j2\nLatitude:T=j4\nLongitude:T=j5\nMGRS:T=j6\nGrid:T=j7\nLocation source:M:GPS,User specified,Form entry,Grid square,Address lookup=l6\nReport Type:T=aReportType\nStatus:M:updatenum\n00. Report note:M=R1 \n01. Incident Name:M=Incident1\n02a. Date/Time:T=Datetime\n03. Facility Name: T=FacilityName3a  \n03b. Facility Type: T=FacilType  \n04a. Contact Name: T=Contact4\n04b. Contact Phone:T=Contactphone\n04c. Extension:T=phoneX\n04d. Cell Phone: T=Cell4\n04e.Street Address:T=M1\n04e.City:T=M2\n04e.State:T=M3\n04e.Zip:T=M4\n04e. Contact Email Address: T=Contactemail\n05. Facility Operating Status: M:NORMAL,MODIFIED,LIMITED,IMPAIRED,NOT FUNCTIONAL,UNKNOWN=A5a\n06. COMMUNICATIONS Impacted:M:YES,NO=commipaired\n07. Utilities Impacted:M:YES,NO=utilitiesimpared\n08. EVACUATIONS:M:YES,NO=evacConcerns\n09. CASULITIES:M:YES,NO=thereArecausalties\n10. Internal disaster plan activated:M:YES,NO=plan10a \n10a.  Facility Command Center activated:M:YES,NO=FCCActive10\n10b.  Emergency generator power in use:M:YES,NO=generator10\n10c.  Resource Request within 4 hours:M:YES,NO=ResourceRreq10\n10d. ADDITIONAL INFORMATION: T=Comments10",
      ResetForm: "Reset Form ",
    },
    numbers: ['exbtn','BtnAttachXML'],
  },
  "Field Situation": {
    templateVersion: "Field Situation Report V 0.2.10",
    parseme: false,
    fixed: {
      FormData: "MapFileName:T=Field Situation Report\nPrecedence:M:Z/ Flash,O/ Immediate,P/ Priority,R/ Routine=j25\nAgency:T=tagency\nTask Number:T=j23\nIs there is an EMERGENT/LIFE SAFETY Need?:M:YES,NO=tk0\nNeed: T=tComm0\nSender:T=j20\nDateTime:T=j3\nLatitude:T=z1\nLongitude:T=z2\nMGRS:T=mgrs  \nLocation source:M:GPS,User specified,Form entry,Grid square=l6\nCity:T=tCity\nCounty:T=tCounty\nState:T=tState\nTerritory:T=tTerritory\n04a. POTS landlines functioning:M:YES,NO,Unknown - N/A=j4\n04a. POTS Comment:T=C1\n04b. VOIP functioning:M:YES,NO,Unknown - N/A=j4A\n04b. VOIP Comment:T=C1A\n05a. Cell Phones Voice functioning:M:YES,NO,Unknown - N/A=j5\n05a. Cell phone Comment:T=C2\n05b. Cell Phones text functioning:M:YES,NO,Unknown - N/A=j5A\n05b. Cell phone text Comment:T=C2A\n06. AM/FM Broadcast Stations functioning:M:YES,NO,Unknown - N/A=j6\n06. Broadcast Station Comment:T=C3\n07a. OTA TV functioning:M:YES,NO,Unknown - N/A=j7\n07a. OTA TV Comment:T=C4\n07b. Satellite TV functioning:M:YES,NO,Unknown - N/A=j7b\n07b. Satellite TV Comment:T=C4b\n07c. Cable TV functioning:M:YES,NO,Unknown - N/A=j7c\n07c. Cable TV Comment:T=C4c\n08. Public Water Works functioning:M:YES,NO,Unknown - N/A=j8\n08. Public Water Works note:T=C5\n09a. Commercial Power functioning:M:YES,NO,Unknown - N/A=j9\n09a. Commercial Power  Comment:T=C6\n09b. Commercial Power Stable:M:YES,NO,Unknown - N/A=j9A\n09b. Commercial Power Stable Comment:T=C6A\n09c. Natural Gas Supply functioning:M:YES,NO,Unknown - N/A=j9c\n09c. Natural Gas Supply functioning Comment:T=C6c\n10. Internet functioning:M:YES,NO,Unknown - N/A=j10\n10. Internet Comment:T=C7\n11a. NOAA/NWS Weather Radio functioning:M:YES,NO,Unknown - N/A=j11\n11a. NOAA/NWS Comment:T=tNOAAcom\n11b. NOAA/NWS Weather Radio Audio degraded:M:YES,NO,Unknown - N/A=j11b\n11b. NOAA/NWS Comment:T=tNOAAcomb\n12. Additional Comments:T=Cmsg\n13. POC:T=j18\n",
      attached_file: "FormData.txt",
      MapFileName: "Field Situation Report",
      resetbtn: "Reset Form",
    },
    numbers: [],
  },
};
