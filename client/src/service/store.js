import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./auth/SliceAuth";
import { ApiAuth } from "./auth/ApiAuth";

// PUBLIC
import appReducer from "./center/SliceApp";
import { ApiPublic } from "./public/ApiPublic";

// ADMIN - PUSAT
import { ApiApp } from "./center/ApiApp";
import { ApiDatabase } from "./center/ApiDatabase";
import { ApiCenterDash } from "./center/ApiCenterDash";
import { ApiHomebase } from "./center/ApiHomebase";
import { ApiAdmin } from "./center/ApiAdmin";
import { ApiAnalysis } from "./center/ApiAnalysis";

// ADMIN - PUSAT - SATUAN
import { ApiTeacher } from "./main/ApiTeacher";
import { ApiPeriode } from "./main/ApiPeriode";
import { ApiMajor } from "./main/ApiMajor";
import { ApiGrade } from "./main/ApiGrade";
import { ApiClass } from "./main/ApiClass";
import { ApiDash } from "./main/ApiDash";
import { ApiSubject } from "./academic/ApiSubject";
import { ApiHomeTeacher } from "./academic/ApiTeacher";
import { ApiStudent } from "./academic/ApiStudent";

// CBT
import { ApiBank } from "./cbt/ApiBank";
import { ApiQuestion } from "./cbt/ApiQuestion";
import { ApiExam } from "./cbt/ApiExam";

// LMS
import { ApiLms } from "./lms/ApiLms";
import { ApiAttendance } from "./lms/ApiAttendance";
import { ApiGrading } from "./lms/ApiGrading";
import { ApiRecap } from "./lms/ApiRecap";
import { ApiParent } from "./lms/ApiParent";

export const store = configureStore({
  reducer: {
    // PUBLIC
    app: appReducer,
    [ApiPublic.reducerPath]: ApiPublic.reducer,

    // OTENTIKASI
    auth: authReducer,
    [ApiAuth.reducerPath]: ApiAuth.reducer,

    // ADMIN - PUSAT
    [ApiApp.reducerPath]: ApiApp.reducer,
    [ApiDatabase.reducerPath]: ApiDatabase.reducer,
    [ApiCenterDash.reducerPath]: ApiCenterDash.reducer,
    [ApiHomebase.reducerPath]: ApiHomebase.reducer,
    [ApiAdmin.reducerPath]: ApiAdmin.reducer,
    [ApiAnalysis.reducerPath]: ApiAnalysis.reducer,

    // ADMIN - SATUAN
    [ApiPeriode.reducerPath]: ApiPeriode.reducer,
    [ApiMajor.reducerPath]: ApiMajor.reducer,
    [ApiGrade.reducerPath]: ApiGrade.reducer,
    [ApiClass.reducerPath]: ApiClass.reducer,
    [ApiDash.reducerPath]: ApiDash.reducer,
    [ApiSubject.reducerPath]: ApiSubject.reducer,
    [ApiHomeTeacher.reducerPath]: ApiHomeTeacher.reducer,
    [ApiStudent.reducerPath]: ApiStudent.reducer,

    // ADMIN - PUSAT - SATUAN
    [ApiTeacher.reducerPath]: ApiTeacher.reducer,

    // CBT
    [ApiBank.reducerPath]: ApiBank.reducer,
    [ApiQuestion.reducerPath]: ApiQuestion.reducer,
    [ApiExam.reducerPath]: ApiExam.reducer,

    // LMS
    [ApiLms.reducerPath]: ApiLms.reducer,
    [ApiAttendance.reducerPath]: ApiAttendance.reducer,
    [ApiGrading.reducerPath]: ApiGrading.reducer,
    [ApiRecap.reducerPath]: ApiRecap.reducer,
    [ApiParent.reducerPath]: ApiParent.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat([
      ApiAuth.middleware,
      ApiPublic.middleware,

      // ADMIN - PUSAT
      ApiApp.middleware,
      ApiDatabase.middleware,
      ApiCenterDash.middleware,
      ApiHomebase.middleware,
      ApiAdmin.middleware,
      ApiAnalysis.middleware,

      // ADMIN - SATUAN
      ApiPeriode.middleware,
      ApiMajor.middleware,
      ApiGrade.middleware,
      ApiClass.middleware,
      ApiDash.middleware,
      ApiSubject.middleware,
      ApiHomeTeacher.middleware,
      ApiStudent.middleware,

      // ADMIN - PUSAT - SATUAN
      ApiTeacher.middleware,

      // CBT
      ApiBank.middleware,
      ApiQuestion.middleware,
      ApiExam.middleware,

      // LMS
      ApiLms.middleware,
      ApiAttendance.middleware,
      ApiGrading.middleware,
      ApiRecap.middleware,
      ApiParent.middleware,
    ]),
  devTools: import.meta.env.DEV,
});
