import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatExpansionModule } from '@angular/material/expansion';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from './header/header.component';
import { PricingComponent } from './pricing/pricing.component';
import { FooterComponent } from './footer/footer.component';
import { SupportComponent } from './support/support.component';
import { SolutionsComponent } from './solutions/solutions.component';
import { RulesEnginesComponent } from './rules-engines/rules-engines.component';

import { FaqComponent } from './faq/faq.component';
import { CookieConsentComponent } from './cookie-consent/cookie-consent.component';
import { WhatIsDataSyncProComponent } from './faq/faq-item/what-is-data-sync-pro/what-is-data-sync-pro.component';
import { DspFiveRulesEnginesComponent } from './faq/faq-item/dsp-five-rules-engines/dsp-five-rules-engines.component';
import { NocodeModularRulesTransformComponent } from './faq/faq-item/nocode-modular-rules-transform/nocode-modular-rules-transform.component';
import { WhyDataSyncProComponent } from './faq/faq-item/why-data-sync-pro/why-data-sync-pro.component';
import { DspOutsideSfOrgComponent } from './faq/faq-item/dsp-outside-sf-org/dsp-outside-sf-org.component';
import { DspSecurityPrivacyComponent } from './faq/faq-item/dsp-security-privacy/dsp-security-privacy.component';
import { DspLicensingPricingComponent } from './faq/faq-item/dsp-licensing-pricing/dsp-licensing-pricing.component';
import { DspThreeUserPersonasComponent } from './faq/faq-item/dsp-three-user-personas/dsp-three-user-personas.component';
import { CompareDspRulesEnginesComponent } from './faq/faq-item/compare-dsp-rules-engines/compare-dsp-rules-engines.component';
import { DspTrainingRequirementsComponent } from './faq/faq-item/dsp-training-requirements/dsp-training-requirements.component';
import { DspDevSdlcComponent } from './faq/faq-item/dsp-dev-sdlc/dsp-dev-sdlc.component';
import { DspSalesforceGovernorLimitsComponent } from './faq/faq-item/dsp-salesforce-governor-limits/dsp-salesforce-governor-limits.component';
import { BatchJobGeneralComponent } from './faq/faq-item/batch-job-general/batch-job-general.component';
import { WhyDspBatchComponent } from './faq/faq-item/why-dsp-batch/why-dsp-batch.component';
import { BatchRulesEngineTechComponent } from './faq/faq-item/batch-rules-engine-tech/batch-rules-engine-tech.component';
import { CommonBatchUseCasesComponent } from './faq/faq-item/common-batch-use-cases/common-batch-use-cases.component';
import { BatchLargeDataVolumesComponent } from './faq/faq-item/batch-large-data-volumes/batch-large-data-volumes.component';
import { CreateBatchExecutableComponent } from './faq/faq-item/create-batch-executable/create-batch-executable.component';
import { BatchCrossorgMigrationsComponent } from './faq/faq-item/batch-crossorg-migrations/batch-crossorg-migrations.component';
import { BatchExecutionPermissionsComponent } from './faq/faq-item/batch-execution-permissions/batch-execution-permissions.component';
import { BatchMaxDatasetSizeComponent } from './faq/faq-item/batch-max-dataset-size/batch-max-dataset-size.component';
import { MaxBatchSizeComponent } from './faq/faq-item/max-batch-size/max-batch-size.component';
import { ChainBatchExecutablesComponent } from './faq/faq-item/chain-batch-executables/chain-batch-executables.component';
import { ScheduleBatchJobsComponent } from './faq/faq-item/schedule-batch-jobs/schedule-batch-jobs.component';
import { StopPipelineOnFailComponent } from './faq/faq-item/stop-pipeline-on-fail/stop-pipeline-on-fail.component';
import { CommonSoqlFilterPipelineComponent } from './faq/faq-item/common-soql-filter-pipeline/common-soql-filter-pipeline.component';
import { BatchParentChildSyncComponent } from './faq/faq-item/batch-parent-child-sync/batch-parent-child-sync.component';
import { BatchLogsTrackingComponent } from './faq/faq-item/batch-logs-tracking/batch-logs-tracking.component';
import { DspReexecFailedBatchesComponent } from './faq/faq-item/dsp-reexec-failed-batches/dsp-reexec-failed-batches.component';
import { RevertBatchChangesComponent } from './faq/faq-item/revert-batch-changes/revert-batch-changes.component';
import { DeltaRetrievalComponent } from './faq/faq-item/delta-retrieval/delta-retrieval.component';
import { BulkApiConsiderationsComponent } from './faq/faq-item/bulk-api-considerations/bulk-api-considerations.component';
import { BatchNotificationsSetupComponent } from './faq/faq-item/batch-notifications-setup/batch-notifications-setup.component';
import { TestBatchSmallSampleComponent } from './faq/faq-item/test-batch-small-sample/test-batch-small-sample.component';
import { ComplexBatchBreakdownComponent } from './faq/faq-item/complex-batch-breakdown/complex-batch-breakdown.component';
import { BlankBatchTriggerAdvantagesComponent } from './faq/faq-item/blank-batch-trigger-advantages/blank-batch-trigger-advantages.component';
import { DspDataListComponent } from './faq/faq-item/dsp-data-list/dsp-data-list.component';
import { WhyDspDataListComponent } from './faq/faq-item/why-dsp-data-list/why-dsp-data-list.component';
import { CreateActionableDataListComponent } from './faq/faq-item/create-actionable-data-list/create-actionable-data-list.component';
import { ActionableDataListComponentsComponent } from './faq/faq-item/actionable-data-list-components/actionable-data-list-components.component';
import { DataListMinRequirementsComponent } from './faq/faq-item/data-list-min-requirements/data-list-min-requirements.component';
import { ActionableVsNonactionableListComponent } from './faq/faq-item/actionable-vs-nonactionable-list/actionable-vs-nonactionable-list.component';
import { DataListPermissionsComponent } from './faq/faq-item/data-list-permissions/data-list-permissions.component';
import { EmbedDataListsLightningComponent } from './faq/faq-item/embed-data-lists-lightning/embed-data-lists-lightning.component';
import { CustomizeButtonLabelIconComponent } from './faq/faq-item/customize-button-label-icon/customize-button-label-icon.component';
import { PromptConfirmButtonComponent } from './faq/faq-item/prompt-confirm-button/prompt-confirm-button.component';
import { ListActionVsRowComponent } from './faq/faq-item/list-action-vs-row/list-action-vs-row.component';
import { ReviewEditTransformedValuesComponent } from './faq/faq-item/review-edit-transformed-values/review-edit-transformed-values.component';
import { GroupDataListsPipelineComponent } from './faq/faq-item/group-data-lists-pipeline/group-data-lists-pipeline.component';
import { ConsolidateActionsDataListComponent } from './faq/faq-item/consolidate-actions-data-list/consolidate-actions-data-list.component';
import { SpecifyRelatedListsRowComponent } from './faq/faq-item/specify-related-lists-row/specify-related-lists-row.component';
import { ReplaceNewRecordCustomComponent } from './faq/faq-item/replace-new-record-custom/replace-new-record-custom.component';
import { DataloaderListActionComponent } from './faq/faq-item/dataloader-list-action/dataloader-list-action.component';
import { DataListQueryAccessComponent } from './faq/faq-item/data-list-query-access/data-list-query-access.component';
import { OpenRecordsLightningPageComponent } from './faq/faq-item/open-records-lightning-page/open-records-lightning-page.component';
import { EndUsersCustomizeQueryComponent } from './faq/faq-item/end-users-customize-query/end-users-customize-query.component';
import { ExtendCustomizeDataListsComponent } from './faq/faq-item/extend-customize-data-lists/extend-customize-data-lists.component';
import { HorizontalScrollDataListComponent } from './faq/faq-item/horizontal-scroll-data-list/horizontal-scroll-data-list.component';
import { RemoteOrgDataListComponent } from './faq/faq-item/remote-org-data-list/remote-org-data-list.component';
import { WhatIsActionButtonComponent } from './faq/faq-item/what-is-action-button/what-is-action-button.component';
import { WhyActionButtonComponent } from './faq/faq-item/why-action-button/why-action-button.component';
import { CreateActionButtonComponent } from './faq/faq-item/create-action-button/create-action-button.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    PricingComponent,
    FooterComponent,
    SupportComponent,
    SolutionsComponent,
    RulesEnginesComponent,
    FaqComponent,
    CookieConsentComponent,
    WhatIsDataSyncProComponent,
    DspFiveRulesEnginesComponent,
    NocodeModularRulesTransformComponent,
    WhyDataSyncProComponent,
    DspOutsideSfOrgComponent,
    DspSecurityPrivacyComponent,
    DspLicensingPricingComponent,
    DspThreeUserPersonasComponent,
    CompareDspRulesEnginesComponent,
    DspTrainingRequirementsComponent,
    DspDevSdlcComponent,
    DspSalesforceGovernorLimitsComponent,
    BatchJobGeneralComponent,
    WhyDspBatchComponent,
    BatchRulesEngineTechComponent,
    CommonBatchUseCasesComponent,
    BatchLargeDataVolumesComponent,
    CreateBatchExecutableComponent,
    BatchCrossorgMigrationsComponent,
    BatchExecutionPermissionsComponent,
    BatchMaxDatasetSizeComponent,
    MaxBatchSizeComponent,
    ChainBatchExecutablesComponent,
    ScheduleBatchJobsComponent,
    StopPipelineOnFailComponent,
    CommonSoqlFilterPipelineComponent,
    BatchParentChildSyncComponent,
    BatchLogsTrackingComponent,
    DspReexecFailedBatchesComponent,
    RevertBatchChangesComponent,
    DeltaRetrievalComponent,
    BulkApiConsiderationsComponent,
    BatchNotificationsSetupComponent,
    TestBatchSmallSampleComponent,
    ComplexBatchBreakdownComponent,
    BlankBatchTriggerAdvantagesComponent,
    DspDataListComponent,
    WhyDspDataListComponent,
    CreateActionableDataListComponent,
    ActionableDataListComponentsComponent,
    DataListMinRequirementsComponent,
    ActionableVsNonactionableListComponent,
    DataListPermissionsComponent,
    EmbedDataListsLightningComponent,
    CustomizeButtonLabelIconComponent,
    PromptConfirmButtonComponent,
    ListActionVsRowComponent,
    ReviewEditTransformedValuesComponent,
    GroupDataListsPipelineComponent,
    ConsolidateActionsDataListComponent,
    SpecifyRelatedListsRowComponent,
    ReplaceNewRecordCustomComponent,
    DataloaderListActionComponent,
    DataListQueryAccessComponent,
    OpenRecordsLightningPageComponent,
    EndUsersCustomizeQueryComponent,
    ExtendCustomizeDataListsComponent,
    HorizontalScrollDataListComponent,
    RemoteOrgDataListComponent,
    WhatIsActionButtonComponent,
    WhyActionButtonComponent,
    CreateActionButtonComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    MatButtonModule,
    MatExpansionModule,
    FormsModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
