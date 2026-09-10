// Offline mirror of the backend simulator, so the dashboard is fully operable
// with only `next dev` running — no Postgres, MinIO or Gemini needed.
//
// The maths is kept in step with:
//   packages/api/src/routes/stream.js        (telemetry generator)
//   packages/api/src/services/riskEngine.js  (factor weights + thresholds)
//
// OFFSET_EVENTS is extracted verbatim from db/seed.sql — every APPROVED
// drilling event whose well sits within 26 km of OIL-W-042, carrying its well
// coordinates so radius filtering is a real geographic query, not a stub.

import { DrillingTelemetry, RiskAssessment, EvidenceItem, Well } from './api';

export interface OffsetEvent extends EvidenceItem {
  depth_end_m: number | null;
  npt_hours: number | null;
  lat: number;
  lon: number;
  distance_km: number;
}

export const OFFSET_EVENTS: OffsetEvent[] = [
  {"id":"929f26ab","well_name":"OIL-W-031","event_type":"TORQUE_SPIKE","depth_m":587.7,"depth_end_m":666.1,"formation":"Girujan","severity":"HIGH","npt_hours":30.6,"mitigation":"Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour","lat":27.0055706,"lon":94.6396768,"distance_km":20.1},
  {"id":"a3bf6273","well_name":"OIL-W-046","event_type":"OTHER","depth_m":665.9,"depth_end_m":686.9,"formation":"Tipam","severity":"MEDIUM","npt_hours":19.9,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":26.8778065,"lon":94.5463422,"distance_km":3.2},
  {"id":"ad68b33c","well_name":"OIL-W-042","event_type":"NPT","depth_m":709.5,"depth_end_m":776.7,"formation":"Tipam","severity":"MEDIUM","npt_hours":null,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"f8b27d7c","well_name":"OIL-W-046","event_type":"OTHER","depth_m":741.5,"depth_end_m":758.8,"formation":"Tipam","severity":"MEDIUM","npt_hours":17.9,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.8778065,"lon":94.5463422,"distance_km":3.2},
  {"id":"3e4766f9","well_name":"OIL-W-023","event_type":"OTHER","depth_m":767.5,"depth_end_m":821,"formation":"Tipam","severity":"MEDIUM","npt_hours":24.2,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"b2d6d18b","well_name":"OIL-W-021","event_type":"NPT","depth_m":782.5,"depth_end_m":835,"formation":"Tipam","severity":"MEDIUM","npt_hours":56.4,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":27.0284344,"lon":94.5998016,"distance_km":20.7},
  {"id":"45408de2","well_name":"OIL-W-046","event_type":"NPT","depth_m":802.9,"depth_end_m":839.1,"formation":"Tipam","severity":"LOW","npt_hours":28.3,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.8778065,"lon":94.5463422,"distance_km":3.2},
  {"id":"27524435","well_name":"OIL-W-002","event_type":"MUD_LOSS","depth_m":873,"depth_end_m":928.4,"formation":"Tipam","severity":"MEDIUM","npt_hours":18,"mitigation":"Pumped LCM (Lost Circulation Material) pill; reduced ECD; spotted calcium carbonate plug","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"dc2c333c","well_name":"OIL-W-001","event_type":"MUD_LOSS","depth_m":916.1,"depth_end_m":977.7,"formation":"Tipam","severity":"MEDIUM","npt_hours":50.2,"mitigation":"Reduced pump rate; set cement plug; waited for cement to set","lat":26.8887082,"lon":94.5385195,"distance_km":4.1},
  {"id":"6f582ff3","well_name":"OIL-W-002","event_type":"NPT","depth_m":1019.2,"depth_end_m":null,"formation":"Tipam","severity":"MEDIUM","npt_hours":45.4,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"83148dc1","well_name":"OIL-W-042","event_type":"OTHER","depth_m":1028.6,"depth_end_m":1101.7,"formation":"Tipam","severity":"MEDIUM","npt_hours":null,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"55ece508","well_name":"OIL-W-033","event_type":"OTHER","depth_m":1074.6,"depth_end_m":null,"formation":"Tipam","severity":"MEDIUM","npt_hours":6.6,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"d02a84dd","well_name":"OIL-W-040","event_type":"MUD_LOSS","depth_m":1110,"depth_end_m":1139.9,"formation":"Tipam","severity":"MEDIUM","npt_hours":58,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"b7c874ef","well_name":"OIL-W-025","event_type":"OTHER","depth_m":1120.7,"depth_end_m":1174.7,"formation":"Tipam","severity":"MEDIUM","npt_hours":13.3,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":26.9232997,"lon":94.5208743,"distance_km":8},
  {"id":"178f77d4","well_name":"OIL-W-025","event_type":"NPT","depth_m":1123.2,"depth_end_m":1134.4,"formation":"Tipam","severity":"MEDIUM","npt_hours":46.6,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.9232997,"lon":94.5208743,"distance_km":8},
  {"id":"8b5829be","well_name":"OIL-W-032","event_type":"OTHER","depth_m":1188.9,"depth_end_m":1236.4,"formation":"Tipam","severity":"MEDIUM","npt_hours":25.1,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.8260878,"lon":94.4868744,"distance_km":5.3},
  {"id":"ed069124","well_name":"OIL-W-023","event_type":"OTHER","depth_m":1271.3,"depth_end_m":1300.4,"formation":"Tipam","severity":"MEDIUM","npt_hours":2.4,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"330d8efb","well_name":"OIL-W-022","event_type":"MUD_LOSS","depth_m":1304.6,"depth_end_m":1342.5,"formation":"Tipam","severity":"MEDIUM","npt_hours":23.3,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":27.0356285,"lon":94.6868834,"distance_km":25.5},
  {"id":"76c643b6","well_name":"OIL-W-011","event_type":"OTHER","depth_m":1394.9,"depth_end_m":null,"formation":"Tipam","severity":"MEDIUM","npt_hours":49.6,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.9931723,"lon":94.6104845,"distance_km":17.5},
  {"id":"80978d7d","well_name":"OIL-W-009","event_type":"OTHER","depth_m":1443.9,"depth_end_m":1499.7,"formation":"Bokabil","severity":"HIGH","npt_hours":null,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.9239513,"lon":94.428458,"distance_km":13},
  {"id":"103f1c67","well_name":"OIL-W-042","event_type":"STUCK_PIPE","depth_m":1452.8,"depth_end_m":1469.8,"formation":"Bokabil","severity":"MEDIUM","npt_hours":66.5,"mitigation":"Pumped 15 m3 diesel-bentonite pill; rotated slowly; freed after 6 hours","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"b2179ab3","well_name":"OIL-W-022","event_type":"TORQUE_SPIKE","depth_m":1485.7,"depth_end_m":1520.8,"formation":"Bokabil","severity":"LOW","npt_hours":null,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":27.0356285,"lon":94.6868834,"distance_km":25.5},
  {"id":"0bb93108","well_name":"OIL-W-006","event_type":"TORQUE_SPIKE","depth_m":1601.7,"depth_end_m":1615.1,"formation":"Bokabil","severity":"MEDIUM","npt_hours":65.1,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"4a256b59","well_name":"OIL-W-021","event_type":"TORQUE_SPIKE","depth_m":1607.5,"depth_end_m":null,"formation":"Bokabil","severity":"LOW","npt_hours":17.7,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":27.0284344,"lon":94.5998016,"distance_km":20.7},
  {"id":"aee880f3","well_name":"OIL-W-042","event_type":"STUCK_PIPE","depth_m":1675.1,"depth_end_m":1705,"formation":"Bokabil","severity":"HIGH","npt_hours":null,"mitigation":"Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"f52b61d7","well_name":"OIL-W-029","event_type":"STUCK_PIPE","depth_m":1676.8,"depth_end_m":null,"formation":"Bokabil","severity":"LOW","npt_hours":40.2,"mitigation":"Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole","lat":27.0261899,"lon":94.6580544,"distance_km":23},
  {"id":"58445359","well_name":"OIL-W-019","event_type":"OTHER","depth_m":1859.4,"depth_end_m":null,"formation":"Bokabil","severity":"HIGH","npt_hours":17.7,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.8218113,"lon":94.4580396,"distance_km":8.1},
  {"id":"b54ad501","well_name":"OIL-W-021","event_type":"TORQUE_SPIKE","depth_m":1870.2,"depth_end_m":1905.1,"formation":"Bokabil","severity":"UNKNOWN","npt_hours":37.3,"mitigation":null,"lat":27.0284344,"lon":94.5998016,"distance_km":20.7},
  {"id":"48e9d9bb","well_name":"OIL-W-042","event_type":"TORQUE_SPIKE","depth_m":1939.7,"depth_end_m":1979.8,"formation":"Bokabil","severity":"HIGH","npt_hours":null,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"0ab51e1d","well_name":"OIL-W-046","event_type":"TORQUE_SPIKE","depth_m":2008.6,"depth_end_m":2019.1,"formation":"Bokabil","severity":"HIGH","npt_hours":46.4,"mitigation":"Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour","lat":26.8778065,"lon":94.5463422,"distance_km":3.2},
  {"id":"853867a6","well_name":"OIL-W-011","event_type":"OTHER","depth_m":2154.1,"depth_end_m":null,"formation":"Bokabil","severity":"MEDIUM","npt_hours":null,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":26.9931723,"lon":94.6104845,"distance_km":17.5},
  {"id":"c4c783c8","well_name":"OIL-W-032","event_type":"STUCK_PIPE","depth_m":2165.5,"depth_end_m":2240.2,"formation":"Bokabil","severity":"UNKNOWN","npt_hours":16.5,"mitigation":null,"lat":26.8260878,"lon":94.4868744,"distance_km":5.3},
  {"id":"60cb49f3","well_name":"OIL-W-040","event_type":"STUCK_PIPE","depth_m":2473.9,"depth_end_m":null,"formation":"Bhuban","severity":"LOW","npt_hours":4.7,"mitigation":"Pumped 15 m3 diesel-bentonite pill; rotated slowly; freed after 6 hours","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"3242db70","well_name":"OIL-W-006","event_type":"MUD_LOSS","depth_m":2705.2,"depth_end_m":2751.7,"formation":"Barail","severity":"HIGH","npt_hours":4.6,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"c3178722","well_name":"OIL-W-006","event_type":"MUD_LOSS","depth_m":2706.5,"depth_end_m":2731.3,"formation":"Barail","severity":"HIGH","npt_hours":11.8,"mitigation":"Pumped LCM (Lost Circulation Material) pill; reduced ECD; spotted calcium carbonate plug","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"0a94de1f","well_name":"OIL-W-006","event_type":"MUD_LOSS","depth_m":2707,"depth_end_m":2731.7,"formation":"Barail","severity":"MEDIUM","npt_hours":10.4,"mitigation":"Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"79ef32af","well_name":"OIL-W-019","event_type":"KICK","depth_m":2710.7,"depth_end_m":2760.5,"formation":"Barail","severity":"HIGH","npt_hours":10.2,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.8218113,"lon":94.4580396,"distance_km":8.1},
  {"id":"071fb13d","well_name":"OIL-W-040","event_type":"TORQUE_SPIKE","depth_m":2712.6,"depth_end_m":2734.3,"formation":"Barail","severity":"HIGH","npt_hours":3,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"26457615","well_name":"OIL-W-019","event_type":"NPT","depth_m":2718.3,"depth_end_m":2763.7,"formation":"Barail","severity":"MEDIUM","npt_hours":22.5,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.8218113,"lon":94.4580396,"distance_km":8.1},
  {"id":"85beb0ff","well_name":"OIL-W-023","event_type":"KICK","depth_m":2720.5,"depth_end_m":2748.3,"formation":"Barail","severity":"HIGH","npt_hours":17.8,"mitigation":"Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"75f0af89","well_name":"OIL-W-006","event_type":"TORQUE_SPIKE","depth_m":2724.5,"depth_end_m":2770.4,"formation":"Barail","severity":"HIGH","npt_hours":11.8,"mitigation":"Reduced WOB from 120 to 80 kN; increased RPM from 80 to 120; resolved after reaming","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"65cfd57e","well_name":"OIL-W-003","event_type":"KICK","depth_m":2726.2,"depth_end_m":2769.5,"formation":"Barail","severity":"HIGH","npt_hours":19,"mitigation":"Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"8e3ee1b9","well_name":"OIL-W-040","event_type":"STUCK_PIPE","depth_m":2737.5,"depth_end_m":2761.9,"formation":"Barail","severity":"HIGH","npt_hours":23,"mitigation":"Applied overpull 80 kN; jarred with 120 kN; worked pipe free after 4 hours","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"70a6ab11","well_name":"OIL-W-025","event_type":"TORQUE_SPIKE","depth_m":2754.6,"depth_end_m":2780.6,"formation":"Barail","severity":"HIGH","npt_hours":11.7,"mitigation":"Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour","lat":26.9232997,"lon":94.5208743,"distance_km":8},
  {"id":"73af16dd","well_name":"OIL-W-023","event_type":"NPT","depth_m":2754.9,"depth_end_m":2767.9,"formation":"Barail","severity":"MEDIUM","npt_hours":16,"mitigation":"Replaced BHA component (MWD tool failure); redressed bit; resumed operations","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"82e2476c","well_name":"OIL-W-019","event_type":"TORQUE_SPIKE","depth_m":2757,"depth_end_m":2803.2,"formation":"Barail","severity":"HIGH","npt_hours":5.2,"mitigation":"Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour","lat":26.8218113,"lon":94.4580396,"distance_km":8.1},
  {"id":"3f3c70c7","well_name":"OIL-W-003","event_type":"STUCK_PIPE","depth_m":2757,"depth_end_m":2788.4,"formation":"Barail","severity":"HIGH","npt_hours":8.8,"mitigation":"Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"d7f1f2c1","well_name":"OIL-W-025","event_type":"KICK","depth_m":2763.1,"depth_end_m":2805.7,"formation":"Barail","severity":"HIGH","npt_hours":12.4,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.9232997,"lon":94.5208743,"distance_km":8},
  {"id":"f1661202","well_name":"OIL-W-036","event_type":"MUD_LOSS","depth_m":2769.5,"depth_end_m":null,"formation":"Bhuban","severity":"UNKNOWN","npt_hours":5.2,"mitigation":null,"lat":26.974817,"lon":94.5048391,"distance_km":13.9},
  {"id":"f2d4d8d3","well_name":"OIL-W-040","event_type":"MUD_LOSS","depth_m":2771.4,"depth_end_m":2807.7,"formation":"Barail","severity":"HIGH","npt_hours":4.3,"mitigation":"Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"658d7f31","well_name":"OIL-W-040","event_type":"KICK","depth_m":2778.1,"depth_end_m":2827.3,"formation":"Barail","severity":"MEDIUM","npt_hours":7.6,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"f006dda0","well_name":"OIL-W-002","event_type":"MUD_LOSS","depth_m":2805.6,"depth_end_m":2827.6,"formation":"Barail","severity":"HIGH","npt_hours":3.1,"mitigation":"Increased mud weight to 1.18 SG; reduced flow rate to 600 LPM","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"027d9d05","well_name":"OIL-W-006","event_type":"KICK","depth_m":2814.8,"depth_end_m":2850.8,"formation":"Barail","severity":"HIGH","npt_hours":7.5,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"39baf91e","well_name":"OIL-W-040","event_type":"STUCK_PIPE","depth_m":2815,"depth_end_m":2825.1,"formation":"Barail","severity":"HIGH","npt_hours":9.8,"mitigation":"Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"da7f90d8","well_name":"OIL-W-033","event_type":"NPT","depth_m":2819,"depth_end_m":2844.1,"formation":"Barail","severity":"HIGH","npt_hours":19.4,"mitigation":"Repaired surface pump; replaced liner assembly; resumed drilling after 12 hours","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"88fecd4d","well_name":"OIL-W-002","event_type":"STUCK_PIPE","depth_m":2827.8,"depth_end_m":2871.3,"formation":"Barail","severity":"HIGH","npt_hours":13,"mitigation":"Applied overpull 80 kN; jarred with 120 kN; worked pipe free after 4 hours","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"6435a091","well_name":"OIL-W-033","event_type":"TORQUE_SPIKE","depth_m":2834,"depth_end_m":2871.4,"formation":"Barail","severity":"MEDIUM","npt_hours":13.6,"mitigation":"Pumped sweep (high-viscosity pill); torque reduced from 18 to 11 kNm after circulation","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"cc471b04","well_name":"OIL-W-033","event_type":"KICK","depth_m":2834.1,"depth_end_m":2856.5,"formation":"Barail","severity":"HIGH","npt_hours":22.9,"mitigation":"Closed BOP; recorded SIDPP 42 bar, SICP 58 bar; circulated out kick in 3 hours","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"93575b4a","well_name":"OIL-W-023","event_type":"KICK","depth_m":2838,"depth_end_m":2882.8,"formation":"Barail","severity":"HIGH","npt_hours":9.8,"mitigation":"Increased mud weight from 1.14 to 1.20 SG; confirmed well static after 6 hours","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"cd6faafe","well_name":"OIL-W-006","event_type":"MUD_LOSS","depth_m":2840.8,"depth_end_m":2878.6,"formation":"Barail","severity":"MEDIUM","npt_hours":24,"mitigation":"Reduced pump rate; set cement plug; waited for cement to set","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"3a393110","well_name":"OIL-W-003","event_type":"MUD_LOSS","depth_m":2844.2,"depth_end_m":2883,"formation":"Barail","severity":"HIGH","npt_hours":23.3,"mitigation":"Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"3a76481d","well_name":"OIL-W-023","event_type":"MUD_LOSS","depth_m":2845.4,"depth_end_m":2888.3,"formation":"Barail","severity":"MEDIUM","npt_hours":14,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"68c586c8","well_name":"OIL-W-040","event_type":"KICK","depth_m":2847,"depth_end_m":2878.8,"formation":"Barail","severity":"HIGH","npt_hours":19.9,"mitigation":"Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"b970eefc","well_name":"OIL-W-025","event_type":"MUD_LOSS","depth_m":2850.7,"depth_end_m":2891.9,"formation":"Barail","severity":"HIGH","npt_hours":21,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":26.9232997,"lon":94.5208743,"distance_km":8},
  {"id":"d5f409e2","well_name":"OIL-W-003","event_type":"TORQUE_SPIKE","depth_m":2854.2,"depth_end_m":2865.7,"formation":"Barail","severity":"MEDIUM","npt_hours":9.4,"mitigation":"Pumped sweep (high-viscosity pill); torque reduced from 18 to 11 kNm after circulation","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"11f801ce","well_name":"OIL-W-003","event_type":"KICK","depth_m":2855.6,"depth_end_m":2872.1,"formation":"Barail","severity":"HIGH","npt_hours":6.4,"mitigation":"Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"d4f3a669","well_name":"OIL-W-006","event_type":"STUCK_PIPE","depth_m":2860.2,"depth_end_m":2875.9,"formation":"Barail","severity":"MEDIUM","npt_hours":15.4,"mitigation":"Backed off at tool joint; sidetracked from 2,780 m; original string lost in hole","lat":26.8226025,"lon":94.5723542,"distance_km":5.2},
  {"id":"0bfbf3eb","well_name":"OIL-W-040","event_type":"STUCK_PIPE","depth_m":2866.1,"depth_end_m":2895.2,"formation":"Barail","severity":"MEDIUM","npt_hours":6,"mitigation":"Spotted oil-based pill; reciprocated string; freed pipe after 8 hours of jarring","lat":26.8519017,"lon":94.5233421,"distance_km":0.9},
  {"id":"2d2dbe49","well_name":"OIL-W-003","event_type":"MUD_LOSS","depth_m":2874.6,"depth_end_m":2899.4,"formation":"Barail","severity":"HIGH","npt_hours":22.6,"mitigation":"Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"f98c0783","well_name":"OIL-W-003","event_type":"MUD_LOSS","depth_m":2880.8,"depth_end_m":2913.6,"formation":"Barail","severity":"MEDIUM","npt_hours":11.7,"mitigation":"Spotted bentonite-based LCM pill; drilled blind with reduced WOB","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"ea721353","well_name":"OIL-W-002","event_type":"MUD_LOSS","depth_m":2881.2,"depth_end_m":2897.2,"formation":"Barail","severity":"HIGH","npt_hours":22.7,"mitigation":"Spotted CaCO3 and mica LCM blend; successfully cured loss after 2 hrs","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"ed18d7c3","well_name":"OIL-W-002","event_type":"KICK","depth_m":2883.5,"depth_end_m":2923.9,"formation":"Barail","severity":"MEDIUM","npt_hours":12.3,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"9be7db54","well_name":"OIL-W-002","event_type":"TORQUE_SPIKE","depth_m":2886.2,"depth_end_m":2927.9,"formation":"Barail","severity":"MEDIUM","npt_hours":5,"mitigation":"Reamed through 50 m interval; cleaned borehole; torque normalized within 1 hour","lat":26.8483808,"lon":94.529408,"distance_km":0.5},
  {"id":"d41e82ca","well_name":"OIL-W-033","event_type":"KICK","depth_m":2889.5,"depth_end_m":2905,"formation":"Barail","severity":"HIGH","npt_hours":3.7,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"9f81448f","well_name":"OIL-W-023","event_type":"KICK","depth_m":2894.7,"depth_end_m":2941.7,"formation":"Barail","severity":"HIGH","npt_hours":13.4,"mitigation":"Detected gain of 2.5 m3; shut-in well; circulated kick out with heavier mud (1.22 SG)","lat":26.7983262,"lon":94.4888974,"distance_km":7.3},
  {"id":"502bed7e","well_name":"OIL-W-042","event_type":"KICK","depth_m":3000.2,"depth_end_m":3059.5,"formation":"Barail","severity":"HIGH","npt_hours":33.4,"mitigation":"Closed BOP; recorded SIDPP 42 bar, SICP 58 bar; circulated out kick in 3 hours","lat":26.852,"lon":94.532,"distance_km":0},
  {"id":"524349f5","well_name":"OIL-W-003","event_type":"KICK","depth_m":3262.9,"depth_end_m":3315.8,"formation":"Barail","severity":"HIGH","npt_hours":null,"mitigation":"Implemented drillers method; confirmed kill weight mud 1.19 SG; resumed operations","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"456bb182","well_name":"OIL-W-036","event_type":"MUD_LOSS","depth_m":3466.7,"depth_end_m":3482.2,"formation":"Barail","severity":"MEDIUM","npt_hours":null,"mitigation":"Reduced pump rate; set cement plug; waited for cement to set","lat":26.974817,"lon":94.5048391,"distance_km":13.9},
  {"id":"e3a85240","well_name":"OIL-W-003","event_type":"OTHER","depth_m":3719.1,"depth_end_m":3752,"formation":"Kopili","severity":"MEDIUM","npt_hours":6.6,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.7623168,"lon":94.4912881,"distance_km":10.8},
  {"id":"d9af834c","well_name":"OIL-W-012","event_type":"OTHER","depth_m":3973.5,"depth_end_m":3979.2,"formation":"Kopili","severity":"HIGH","npt_hours":8.2,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":27.0305437,"lon":94.6831998,"distance_km":24.9},
  {"id":"3dcb1525","well_name":"OIL-W-033","event_type":"OTHER","depth_m":4010.5,"depth_end_m":4059.5,"formation":"Kopili","severity":"LOW","npt_hours":47,"mitigation":"Investigated issue; implemented corrective measures; resumed drilling","lat":26.9433566,"lon":94.5729987,"distance_km":10.9},
  {"id":"92ce472e","well_name":"OIL-W-036","event_type":"OTHER","depth_m":4089.9,"depth_end_m":null,"formation":"Kopili","severity":"MEDIUM","npt_hours":10.4,"mitigation":"Held team review; adjusted drilling parameters; monitored closely","lat":26.974817,"lon":94.5048391,"distance_km":13.9},
  {"id":"85a19a05","well_name":"OIL-W-036","event_type":"CEMENTING_ISSUE","depth_m":4207.1,"depth_end_m":null,"formation":"Sylhet","severity":"MEDIUM","npt_hours":27.7,"mitigation":"Performed cement bond log; perforated and squeezed top perforations; re-evaluated","lat":26.974817,"lon":94.5048391,"distance_km":13.9},
  {"id":"afce1959","well_name":"OIL-W-036","event_type":"CEMENTING_ISSUE","depth_m":4232.4,"depth_end_m":4243.8,"formation":"Sylhet","severity":"MEDIUM","npt_hours":57.6,"mitigation":"Placed remedial cement plug; allowed 48 hours WOC; drilled out and continued","lat":26.974817,"lon":94.5048391,"distance_km":13.9}
];

/**
 * Every well in db/seed.sql within 26 km of OIL-W-042, so the map, the rig
 * selector and the offset table are populated even with the API stack down.
 * distance_km is measured from OIL-W-042 and recomputed at runtime whenever a
 * different rig is made active.
 */
export const NEARBY_WELLS: Well[] = [
  {"id":"9f4a9757-1ccd-4321-bccb-ccb0d32a9105","name":"OIL-W-042","api_number":"IN-AS-OIL-00042","latitude":26.852,"longitude":94.532,"status":"active","total_depth_m":3200,"basin":"Brahmaputra","field":"Moran","distance_km":0,"is_synthetic":true},
  {"id":"ef478f45-c00f-4ddb-b8ba-dbd5d9571dbc","name":"OIL-W-002","api_number":"IN-AS-OIL-00002","latitude":26.8483808,"longitude":94.529408,"status":"completed","total_depth_m":2099.8,"basin":"Brahmaputra","field":"Lakwa","distance_km":0.5,"is_synthetic":true},
  {"id":"fbd4bd88-b317-4e3e-a41a-89b59de50946","name":"OIL-W-040","api_number":"IN-AS-OIL-00040","latitude":26.8519017,"longitude":94.5233421,"status":"completed","total_depth_m":3669.4,"basin":"Brahmaputra","field":"Lakwa","distance_km":0.9,"is_synthetic":true},
  {"id":"6a566cc4-d2e7-4054-86c2-76843f89ca3c","name":"OIL-W-017","api_number":"IN-AS-OIL-00017","latitude":26.8643932,"longitude":94.5518552,"status":"completed","total_depth_m":3977.5,"basin":"Brahmaputra","field":"Lakwa","distance_km":2.4,"is_synthetic":true},
  {"id":"b6564c59-dab4-4042-bd3a-954453f726a4","name":"OIL-W-046","api_number":"IN-AS-OIL-00046","latitude":26.8778065,"longitude":94.5463422,"status":"active","total_depth_m":2648.6,"basin":"Brahmaputra","field":"Lakwa","distance_km":3.2,"is_synthetic":true},
  {"id":"6d6e185e-08d9-4191-b766-ba14a5537f1e","name":"OIL-W-001","api_number":"IN-AS-OIL-00001","latitude":26.8887082,"longitude":94.5385195,"status":"abandoned","total_depth_m":2514.3,"basin":"Brahmaputra","field":"Lakwa","distance_km":4.1,"is_synthetic":true},
  {"id":"26a76c74-f8b7-4704-ae75-630052a50725","name":"OIL-W-006","api_number":"IN-AS-OIL-00006","latitude":26.8226025,"longitude":94.5723542,"status":"completed","total_depth_m":2646.5,"basin":"Brahmaputra","field":"Lakwa","distance_km":5.2,"is_synthetic":true},
  {"id":"29014286-5b03-40b9-bb57-7c5e9ca21118","name":"OIL-W-032","api_number":"IN-AS-OIL-00032","latitude":26.8260878,"longitude":94.4868744,"status":"abandoned","total_depth_m":3115.5,"basin":"Brahmaputra","field":"Lakwa","distance_km":5.3,"is_synthetic":true},
  {"id":"4806f8dc-913a-45dd-8a38-29698d4cb519","name":"OIL-W-023","api_number":"IN-AS-OIL-00023","latitude":26.7983262,"longitude":94.4888974,"status":"completed","total_depth_m":2158,"basin":"Brahmaputra","field":"Lakwa","distance_km":7.3,"is_synthetic":true},
  {"id":"eecbb42e-50e7-42e7-bda8-ac404d1a27f5","name":"OIL-W-025","api_number":"IN-AS-OIL-00025","latitude":26.9232997,"longitude":94.5208743,"status":"completed","total_depth_m":2202.4,"basin":"Brahmaputra","field":"Lakwa","distance_km":8,"is_synthetic":true},
  {"id":"dc0e20d4-4a26-4887-804b-ca5e73d14e5d","name":"OIL-W-019","api_number":"IN-AS-OIL-00019","latitude":26.8218113,"longitude":94.4580396,"status":"completed","total_depth_m":2653.8,"basin":"Brahmaputra","field":"Lakwa","distance_km":8.1,"is_synthetic":true},
  {"id":"752c2107-af43-4e94-89ee-e6c1d9e5a483","name":"OIL-W-003","api_number":"IN-AS-OIL-00003","latitude":26.7623168,"longitude":94.4912881,"status":"completed","total_depth_m":4044.2,"basin":"Brahmaputra","field":"Lakwa","distance_km":10.8,"is_synthetic":true},
  {"id":"33fd13a9-f4c7-4f82-90b2-862e6ad42d86","name":"OIL-W-033","api_number":"IN-AS-OIL-00033","latitude":26.9433566,"longitude":94.5729987,"status":"completed","total_depth_m":4361.9,"basin":"Brahmaputra","field":"Lakwa","distance_km":10.9,"is_synthetic":true},
  {"id":"e78b5600-b073-487a-ba59-8640ce9ee2e2","name":"OIL-W-009","api_number":"IN-AS-OIL-00009","latitude":26.9239513,"longitude":94.428458,"status":"completed","total_depth_m":3016.4,"basin":"Brahmaputra","field":"Lakwa","distance_km":13,"is_synthetic":true},
  {"id":"587b3d9f-38d6-43fc-9c7f-8bb043591d51","name":"OIL-W-036","api_number":"IN-AS-OIL-00036","latitude":26.974817,"longitude":94.5048391,"status":"completed","total_depth_m":4515.8,"basin":"Brahmaputra","field":"Lakwa","distance_km":13.9,"is_synthetic":true},
  {"id":"92b3d1d8-0117-4638-8aed-3163014f36be","name":"OIL-W-011","api_number":"IN-AS-OIL-00011","latitude":26.9931723,"longitude":94.6104845,"status":"completed","total_depth_m":2583.4,"basin":"Brahmaputra","field":"Geleki","distance_km":17.5,"is_synthetic":true},
  {"id":"8154a69b-8c28-4c5c-853c-a66ce818789b","name":"OIL-W-031","api_number":"IN-AS-OIL-00031","latitude":27.0055706,"longitude":94.6396768,"status":"completed","total_depth_m":3313.5,"basin":"Brahmaputra","field":"Geleki","distance_km":20.1,"is_synthetic":true},
  {"id":"258ba2bd-05f0-43cb-838a-6dba58834c8a","name":"OIL-W-021","api_number":"IN-AS-OIL-00021","latitude":27.0284344,"longitude":94.5998016,"status":"completed","total_depth_m":2140.5,"basin":"Brahmaputra","field":"Geleki","distance_km":20.7,"is_synthetic":true},
  {"id":"f27f8be1-997a-4607-ae71-dbcafb138086","name":"OIL-W-029","api_number":"IN-AS-OIL-00029","latitude":27.0261899,"longitude":94.6580544,"status":"completed","total_depth_m":3819.5,"basin":"Brahmaputra","field":"Geleki","distance_km":23,"is_synthetic":true},
  {"id":"69e51e04-4f5f-42de-83b1-4314344cfab9","name":"OIL-W-012","api_number":"IN-AS-OIL-00012","latitude":27.0305437,"longitude":94.6831998,"status":"completed","total_depth_m":4258.6,"basin":"Brahmaputra","field":"Geleki","distance_km":24.9,"is_synthetic":true},
  {"id":"f054d20b-2389-4c77-bd9b-836e197189b7","name":"OIL-W-022","api_number":"IN-AS-OIL-00022","latitude":27.0356285,"longitude":94.6868834,"status":"active","total_depth_m":2317,"basin":"Brahmaputra","field":"Geleki","distance_km":25.5,"is_synthetic":true}
];

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Deterministic hash noise. The API uses Math.random(); replaying the same
// depth here must redraw the same trace, otherwise the chart flickers on
// re-render and the check below could not assert anything.
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** The Barail overpressure interval the demo narrative is built around. */
export const ANOMALY_WINDOW = { top: 2780, bottom: 2825 };

/** Telemetry at a given bit depth — mirrors stream.js. */
export function telemetryAt(depth: number): DrillingTelemetry {
  const anomaly = depth >= ANOMALY_WINDOW.top && depth <= ANOMALY_WINDOW.bottom;
  const r1 = noise(depth);
  const r2 = noise(depth + 7.3);
  return {
    rop_m_hr:
      Math.round((14.5 + Math.sin(depth * 0.8) * 2.2 - (anomaly ? 4.5 : 0)) * 10) / 10,
    wob_tonnes: Math.round((12.5 + Math.cos(depth * 0.5) * 1.1) * 10) / 10,
    rpm: Math.round(110 + Math.sin(depth * 0.3) * 6),
    torque_kn_m:
      Math.round((18.2 + (anomaly ? 6.2 + r1 * 2 : Math.sin(depth) * 1.2)) * 10) / 10,
    mud_weight_sg: anomaly ? 1.21 : 1.16,
    spp_psi: Math.round(3120 + (anomaly ? 240 : Math.sin(depth * 0.4) * 45)),
    gas_units: Math.round(anomaly ? 165 + r2 * 30 : 32 + Math.sin(depth * 0.2) * 8),
    status: anomaly ? 'ANOMALY_DETECTED' : 'NORMAL',
  };
}

/**
 * Proximity hazard score — mirrors riskEngine.js exactly (same factor caps,
 * same ±100 m depth window, same LOW/MEDIUM/HIGH and confidence thresholds),
 * but resolves the offset set from OFFSET_EVENTS instead of PostGIS.
 */
export function assessRiskAt(
  currentDepthM: number,
  formation = 'Barail',
  radiusKm = 10,
  origin: { lat: number; lon: number } = { lat: 26.852, lon: 94.532 }
): RiskAssessment {
  const events = OFFSET_EVENTS.filter(
    (e) =>
      Math.abs(e.depth_m - currentDepthM) <= 100 &&
      distanceKm(origin, { lat: e.lat, lon: e.lon }) <= radiusKm
  ).sort(
    (a, b) => Math.abs(a.depth_m - currentDepthM) - Math.abs(b.depth_m - currentDepthM)
  );

  const factors = (d: number, f: number, r: number, c: number) => [
    { name: 'depth_proximity', score: d, max: 35 },
    { name: 'formation_match', score: f, max: 25 },
    { name: 'event_recurrence', score: r, max: 20 },
    { name: 'context_score', score: c, max: 20 },
  ];

  if (events.length === 0) {
    return {
      score: 0,
      level: 'LOW',
      confidence: 'LOW',
      factors: factors(0, 0, 0, 0),
      evidence: [],
      evidenceWellCount: 0,
      current_depth_m: currentDepthM,
    };
  }

  const minDelta = Math.min(...events.map((e) => Math.abs(e.depth_m - currentDepthM)));
  const depthScore = Math.round(35 * (1 - Math.min(minDelta, 200) / 200));
  const formationScore = events.some((e) => e.formation === formation) ? 25 : 0;
  const recurrenceScore = Math.min(20, 5 * events.length);
  const contextScore = new Set(events.map((e) => e.event_type)).size >= 2 ? 10 : 0;

  const score = Math.min(100, depthScore + formationScore + recurrenceScore + contextScore);
  const wells = new Set(events.map((e) => e.well_name)).size;

  return {
    score,
    level: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
    confidence: wells >= 4 ? 'HIGH' : wells >= 2 ? 'MEDIUM' : 'LOW',
    factors: factors(depthScore, formationScore, recurrenceScore, contextScore),
    evidence: events.slice(0, 5),
    evidenceWellCount: wells,
    current_depth_m: currentDepthM,
  };
}

/** Human-readable one-liner for the alert feed. */
export function alertMessage(risk: RiskAssessment): string {
  const top = risk.evidence[0];
  if (!top) return 'Offset well incident nearby';
  return `${top.event_type.replace(/_/g, ' ').toLowerCase()} logged on ${top.well_name} at ${top.depth_m} m`;
}

/** Offset wells around a rig, with distances measured from that rig. */
export function wellsAround(origin: { lat: number; lon: number }): Well[] {
  return NEARBY_WELLS.map((w) => ({
    ...w,
    distance_km:
      Math.round(distanceKm(origin, { lat: w.latitude, lon: w.longitude }) * 10) / 10,
  })).sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

/** Incident counts per offset well, for the offset-wells table. */
export function eventsByWell(): Record<string, OffsetEvent[]> {
  return OFFSET_EVENTS.reduce<Record<string, OffsetEvent[]>>((acc, e) => {
    (acc[e.well_name] ||= []).push(e);
    return acc;
  }, {});
}

/**
 * Keyword retrieval over the offset corpus — what the Copilot falls back to
 * when the Gemini-backed /assistant endpoint is unreachable. Deliberately
 * dumb: term overlap on well name, formation, event type and mitigation.
 */
export function searchEvents(query: string, limit = 4): OffsetEvent[] {
  const terms = query.toLowerCase().match(/[a-z0-9.]+/g) ?? [];
  if (terms.length === 0) return [];
  const depth = Number(query.match(/(\d{3,4})\s*m/i)?.[1]);

  return OFFSET_EVENTS.map((e) => {
    const hay = `${e.well_name} ${e.formation} ${e.event_type} ${e.severity} ${e.mitigation ?? ''}`
      .toLowerCase()
      .replace(/_/g, ' ');
    let score = terms.reduce((n, t) => (t.length > 2 && hay.includes(t) ? n + 1 : n), 0);
    if (!Number.isNaN(depth) && Math.abs(e.depth_m - depth) <= 120) score += 2;
    return { e, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.e.severity.localeCompare(a.e.severity))
    .slice(0, limit)
    .map((r) => r.e);
}

/**
 * Drilling events shaped like the /events API rows, for the steward queue and
 * the well-record modal when the API is unreachable. Review status is derived
 * deterministically from the event id so the queue has a realistic mix of
 * pending and approved records instead of being empty.
 */
export function localEvents(reviewStatus?: string) {
  const rows = OFFSET_EVENTS.map((e) => ({
    id: e.id,
    well_name: e.well_name,
    event_type: e.event_type,
    depth_start_m: e.depth_m,
    depth_end_m: e.depth_end_m,
    formation: e.formation,
    severity: e.severity,
    duration_hrs: e.npt_hours,
    description: `${e.event_type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())} encountered at ${e.depth_m} m in the ${e.formation} formation.`,
    mitigation: e.mitigation,
    review_status: parseInt(e.id.slice(0, 2), 16) % 3 === 0 ? 'EXTRACTED' : 'APPROVED',
  }));
  return reviewStatus ? rows.filter((r) => r.review_status === reviewStatus) : rows;
}

/** Events logged against one well, by name — the offline well-record view. */
export function localEventsForWell(wellName: string) {
  return localEvents().filter((e) => e.well_name === wellName);
}
