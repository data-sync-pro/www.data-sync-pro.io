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
import { GeneralWhatIsDspComponent } from './faq/faq-item/general-what-is-dsp/general-what-is-dsp.component';
import { GeneralFiveDspEnginesComponent } from './faq/faq-item/general-five-dsp-engines/general-five-dsp-engines.component';
import { GeneralNoCodeRulesTransformComponent } from './faq/faq-item/general-no-code-rules-transform/general-no-code-rules-transform.component';
import { GeneralWhyDspComponent } from './faq/faq-item/general-why-dsp/general-why-dsp.component';
import { GeneralDspExternalDataComponent } from './faq/faq-item/general-dsp-external-data/general-dsp-external-data.component';
import { GeneralDspSecurityPrivacyComponent } from './faq/faq-item/general-dsp-security-privacy/general-dsp-security-privacy.component';
import { GeneralDspLicensingPricingComponent } from './faq/faq-item/general-dsp-licensing-pricing/general-dsp-licensing-pricing.component';
import { GeneralThreeUserPersonasComponent } from './faq/faq-item/general-three-user-personas/general-three-user-personas.component';
import { GeneralDspRulesEnginesCompareComponent } from './faq/faq-item/general-dsp-rules-engines-compare/general-dsp-rules-engines-compare.component';
import { GeneralDspTrainingNeededComponent } from './faq/faq-item/general-dsp-training-needed/general-dsp-training-needed.component';
import { GeneralDspAdheresSdlcComponent } from './faq/faq-item/general-dsp-adheres-sdlc/general-dsp-adheres-sdlc.component';
import { GeneralDspGovernorLimitsComponent } from './faq/faq-item/general-dsp-governor-limits/general-dsp-governor-limits.component';
import { RulesEnginesBatchWhatIsBatchJobComponent } from './faq/faq-item/rules-engines-batch-what-is-batch-job/rules-engines-batch-what-is-batch-job.component';
import { RulesEnginesBatchWhyDspBatchComponent } from './faq/faq-item/rules-engines-batch-why-dsp-batch/rules-engines-batch-why-dsp-batch.component';
import { RulesEnginesBatchBatchTechnologiesUsedComponent } from './faq/faq-item/rules-engines-batch-batch-technologies-used/rules-engines-batch-batch-technologies-used.component';
import { RulesEnginesBatchBatchUseCasesComponent } from './faq/faq-item/rules-engines-batch-batch-use-cases/rules-engines-batch-batch-use-cases.component';
import { RulesEnginesBatchBatchLargeVolumesComponent } from './faq/faq-item/rules-engines-batch-batch-large-volumes/rules-engines-batch-batch-large-volumes.component';
import { RulesEnginesBatchCreateBatchExecutableComponent } from './faq/faq-item/rules-engines-batch-create-batch-executable/rules-engines-batch-create-batch-executable.component';
import { RulesEnginesBatchBatchCrossOrgComponent } from './faq/faq-item/rules-engines-batch-batch-cross-org/rules-engines-batch-batch-cross-org.component';
import { RulesEnginesBatchBatchPermissionsNeededComponent } from './faq/faq-item/rules-engines-batch-batch-permissions-needed/rules-engines-batch-batch-permissions-needed.component';
import { RulesEnginesBatchBatchMaxDatasetComponent } from './faq/faq-item/rules-engines-batch-batch-max-dataset/rules-engines-batch-batch-max-dataset.component';
import { RulesEnginesBatchBatchMaxSizeComponent } from './faq/faq-item/rules-engines-batch-batch-max-size/rules-engines-batch-batch-max-size.component';
import { RulesEnginesBatchChainBatchExecutablesComponent } from './faq/faq-item/rules-engines-batch-chain-batch-executables/rules-engines-batch-chain-batch-executables.component';
import { RulesEnginesBatchScheduleBatchJobsComponent } from './faq/faq-item/rules-engines-batch-schedule-batch-jobs/rules-engines-batch-schedule-batch-jobs.component';
import { RulesEnginesBatchStopPipelineOnFailComponent } from './faq/faq-item/rules-engines-batch-stop-pipeline-on-fail/rules-engines-batch-stop-pipeline-on-fail.component';
import { RulesEnginesBatchCommonSoqlPipelineComponent } from './faq/faq-item/rules-engines-batch-common-soql-pipeline/rules-engines-batch-common-soql-pipeline.component';
import { RulesEnginesBatchBatchParentChildComponent } from './faq/faq-item/rules-engines-batch-batch-parent-child/rules-engines-batch-batch-parent-child.component';
import { RulesEnginesBatchBatchLogsTrackedComponent } from './faq/faq-item/rules-engines-batch-batch-logs-tracked/rules-engines-batch-batch-logs-tracked.component';
import { RulesEnginesBatchReExecuteFailedBatchesComponent } from './faq/faq-item/rules-engines-batch-re-execute-failed-batches/rules-engines-batch-re-execute-failed-batches.component';
import { RulesEnginesBatchRevertBatchChangesComponent } from './faq/faq-item/rules-engines-batch-revert-batch-changes/rules-engines-batch-revert-batch-changes.component';
import { RulesEnginesBatchDeltaRetrievalComponent } from './faq/faq-item/rules-engines-batch-delta-retrieval/rules-engines-batch-delta-retrieval.component';
import { RulesEnginesBatchBulkApiConsiderationsComponent } from './faq/faq-item/rules-engines-batch-bulk-api-considerations/rules-engines-batch-bulk-api-considerations.component';
import { RulesEnginesBatchBatchNotificationsComponent } from './faq/faq-item/rules-engines-batch-batch-notifications/rules-engines-batch-batch-notifications.component';
import { RulesEnginesBatchTestBatchWithSampleComponent } from './faq/faq-item/rules-engines-batch-test-batch-with-sample/rules-engines-batch-test-batch-with-sample.component';
import { RulesEnginesBatchBreakDownComplexBatchComponent } from './faq/faq-item/rules-engines-batch-break-down-complex-batch/rules-engines-batch-break-down-complex-batch.component';
import { RulesEnginesBatchBlankUpdateBatchAdvantagesComponent } from './faq/faq-item/rules-engines-batch-blank-update-batch-advantages/rules-engines-batch-blank-update-batch-advantages.component';
import { RulesEnginesDataListWhatIsDataListComponent } from './faq/faq-item/rules-engines-data-list-what-is-data-list/rules-engines-data-list-what-is-data-list.component';
import { RulesEnginesDataListWhyDspDataListComponent } from './faq/faq-item/rules-engines-data-list-why-dsp-data-list/rules-engines-data-list-why-dsp-data-list.component';
import { RulesEnginesDataListCreateActionableDataListComponent } from './faq/faq-item/rules-engines-data-list-create-actionable-data-list/rules-engines-data-list-create-actionable-data-list.component';
import { RulesEnginesDataListTwoComponentsDataListComponent } from './faq/faq-item/rules-engines-data-list-two-components-data-list/rules-engines-data-list-two-components-data-list.component';
import { RulesEnginesDataListDataListMinReqsComponent } from './faq/faq-item/rules-engines-data-list-data-list-min-reqs/rules-engines-data-list-data-list-min-reqs.component';
import { RulesEnginesDataListActionableVsNonactionableComponent } from './faq/faq-item/rules-engines-data-list-actionable-vs-nonactionable/rules-engines-data-list-actionable-vs-nonactionable.component';
import { RulesEnginesDataListDataListPermissionsComponent } from './faq/faq-item/rules-engines-data-list-data-list-permissions/rules-engines-data-list-data-list-permissions.component';
import { RulesEnginesDataListEmbedDataListsLightningComponent } from './faq/faq-item/rules-engines-data-list-embed-data-lists-lightning/rules-engines-data-list-embed-data-lists-lightning.component';
import { RulesEnginesDataListCustomizeActionUiComponent } from './faq/faq-item/rules-engines-data-list-customize-action-ui/rules-engines-data-list-customize-action-ui.component';
import { RulesEnginesDataListActionConfirmationPromptComponent } from './faq/faq-item/rules-engines-data-list-action-confirmation-prompt/rules-engines-data-list-action-confirmation-prompt.component';
import { RulesEnginesDataListSpecifyActionScopeComponent } from './faq/faq-item/rules-engines-data-list-specify-action-scope/rules-engines-data-list-specify-action-scope.component';
import { RulesEnginesDataListReviewEditTransformedComponent } from './faq/faq-item/rules-engines-data-list-review-edit-transformed/rules-engines-data-list-review-edit-transformed.component';
import { RulesEnginesDataListGroupDataListsComponent } from './faq/faq-item/rules-engines-data-list-group-data-lists/rules-engines-data-list-group-data-lists.component';
import { RulesEnginesDataListConsolidateDataListActionsComponent } from './faq/faq-item/rules-engines-data-list-consolidate-data-list-actions/rules-engines-data-list-consolidate-data-list-actions.component';
import { RulesEnginesDataListSpecifyRelatedListsComponent } from './faq/faq-item/rules-engines-data-list-specify-related-lists/rules-engines-data-list-specify-related-lists.component';
import { RulesEnginesDataListReplaceNewRecordComponent } from './faq/faq-item/rules-engines-data-list-replace-new-record/rules-engines-data-list-replace-new-record.component';
import { RulesEnginesDataListDataLoaderListActionComponent } from './faq/faq-item/rules-engines-data-list-data-loader-list-action/rules-engines-data-list-data-loader-list-action.component';
import { RulesEnginesDataListDataListQueryPermissionsComponent } from './faq/faq-item/rules-engines-data-list-data-list-query-permissions/rules-engines-data-list-data-list-query-permissions.component';
import { RulesEnginesDataListOpenRecordInLightningComponent } from './faq/faq-item/rules-engines-data-list-open-record-in-lightning/rules-engines-data-list-open-record-in-lightning.component';
import { RulesEnginesDataListEndUserQueryCustomizationComponent } from './faq/faq-item/rules-engines-data-list-end-user-query-customization/rules-engines-data-list-end-user-query-customization.component';
import { RulesEnginesDataListExtendDataListsLwcComponent } from './faq/faq-item/rules-engines-data-list-extend-data-lists-lwc/rules-engines-data-list-extend-data-lists-lwc.component';
import { RulesEnginesDataListHorizontalScrollingDataListComponent } from './faq/faq-item/rules-engines-data-list-horizontal-scrolling-data-list/rules-engines-data-list-horizontal-scrolling-data-list.component';
import { RulesEnginesDataListRemoteOrgDataListComponent } from './faq/faq-item/rules-engines-data-list-remote-org-data-list/rules-engines-data-list-remote-org-data-list.component';
import { RulesEnginesActionButtonWhatIsActionButtonComponent } from './faq/faq-item/rules-engines-action-button-what-is-action-button/rules-engines-action-button-what-is-action-button.component';
import { RulesEnginesActionButtonWhyDspActionButtonComponent } from './faq/faq-item/rules-engines-action-button-why-dsp-action-button/rules-engines-action-button-why-dsp-action-button.component';
import { RulesEnginesActionButtonCreateActionButtonComponent } from './faq/faq-item/rules-engines-action-button-create-action-button/rules-engines-action-button-create-action-button.component';
import { RulesEnginesActionButtonCustomizeActionUiComponent } from './faq/faq-item/rules-engines-action-button-customize-action-ui/rules-engines-action-button-customize-action-ui.component';
import { RulesEnginesActionButtonActionConfirmationPromptComponent } from './faq/faq-item/rules-engines-action-button-action-confirmation-prompt/rules-engines-action-button-action-confirmation-prompt.component';
import { RulesEnginesActionButtonDisplayTransformedValuesComponent } from './faq/faq-item/rules-engines-action-button-display-transformed-values/rules-engines-action-button-display-transformed-values.component';
import { RulesEnginesActionButtonGroupActionButtonsComponent } from './faq/faq-item/rules-engines-action-button-group-action-buttons/rules-engines-action-button-group-action-buttons.component';
import { RulesEnginesActionButtonSeriesActionsOneClickComponent } from './faq/faq-item/rules-engines-action-button-series-actions-one-click/rules-engines-action-button-series-actions-one-click.component';
import { RulesEnginesActionButtonActionButtonAccessComponent } from './faq/faq-item/rules-engines-action-button-action-button-access/rules-engines-action-button-action-button-access.component';
import { RulesEnginesDataLoaderDataLoaderOverviewComponent } from './faq/faq-item/rules-engines-data-loader-data-loader-overview/rules-engines-data-loader-data-loader-overview.component';
import { RulesEnginesDataLoaderCreateDataLoaderComponent } from './faq/faq-item/rules-engines-data-loader-create-data-loader/rules-engines-data-loader-create-data-loader.component';
import { RulesEnginesDataLoaderLoadDataDifferentOrgComponent } from './faq/faq-item/rules-engines-data-loader-load-data-different-org/rules-engines-data-loader-load-data-different-org.component';
import { RulesEnginesDataLoaderDataLoaderLogsComponent } from './faq/faq-item/rules-engines-data-loader-data-loader-logs/rules-engines-data-loader-data-loader-logs.component';
import { RulesEnginesDataLoaderDataLoaderTypeConversionComponent } from './faq/faq-item/rules-engines-data-loader-data-loader-type-conversion/rules-engines-data-loader-data-loader-type-conversion.component';
import { RulesEnginesDataLoaderDataLoaderAccessComponent } from './faq/faq-item/rules-engines-data-loader-data-loader-access/rules-engines-data-loader-data-loader-access.component';
import { RulesEnginesDataLoaderDataLoaderCsvOnlyComponent } from './faq/faq-item/rules-engines-data-loader-data-loader-csv-only/rules-engines-data-loader-data-loader-csv-only.component';
import { RulesEnginesDataLoaderSerialModeUsageComponent } from './faq/faq-item/rules-engines-data-loader-serial-mode-usage/rules-engines-data-loader-serial-mode-usage.component';
import { RulesEnginesDataLoaderReExecuteFailedLoadComponent } from './faq/faq-item/rules-engines-data-loader-re-execute-failed-load/rules-engines-data-loader-re-execute-failed-load.component';
import { RulesEnginesDataLoaderRevertDataLoadComponent } from './faq/faq-item/rules-engines-data-loader-revert-data-load/rules-engines-data-loader-revert-data-load.component';
import { RulesEnginesDataLoaderFailOnMissingColumnComponent } from './faq/faq-item/rules-engines-data-loader-fail-on-missing-column/rules-engines-data-loader-fail-on-missing-column.component';
import { RulesEnginesDataLoaderLoaderAsListActionComponent } from './faq/faq-item/rules-engines-data-loader-loader-as-list-action/rules-engines-data-loader-loader-as-list-action.component';
import { RulesEnginesTriggersTriggerRulesEngineComponent } from './faq/faq-item/rules-engines-triggers-trigger-rules-engine/rules-engines-triggers-trigger-rules-engine.component';
import { RulesEnginesTriggersWhyDspTriggerComponent } from './faq/faq-item/rules-engines-triggers-why-dsp-trigger/rules-engines-triggers-why-dsp-trigger.component';
import { RulesEnginesTriggersTriggerEventsSupportedComponent } from './faq/faq-item/rules-engines-triggers-trigger-events-supported/rules-engines-triggers-trigger-events-supported.component';
import { RulesEnginesTriggersSelfAdaptiveTriggerComponent } from './faq/faq-item/rules-engines-triggers-self-adaptive-trigger/rules-engines-triggers-self-adaptive-trigger.component';
import { RulesEnginesTriggersSetupSelfAdaptiveTriggerComponent } from './faq/faq-item/rules-engines-triggers-setup-self-adaptive-trigger/rules-engines-triggers-setup-self-adaptive-trigger.component';
import { RulesEnginesTriggersAggregationSelfAdaptiveComponent } from './faq/faq-item/rules-engines-triggers-aggregation-self-adaptive/rules-engines-triggers-aggregation-self-adaptive.component';
import { RulesEnginesTriggersValidationSelfAdaptiveComponent } from './faq/faq-item/rules-engines-triggers-validation-self-adaptive/rules-engines-triggers-validation-self-adaptive.component';
import { RulesEnginesTriggersWhatIsTriggerActionComponent } from './faq/faq-item/rules-engines-triggers-what-is-trigger-action/rules-engines-triggers-what-is-trigger-action.component';
import { RulesEnginesTriggersSetupTriggerActionComponent } from './faq/faq-item/rules-engines-triggers-setup-trigger-action/rules-engines-triggers-setup-trigger-action.component';
import { RulesEnginesTriggersDspTriggerFlowComponent } from './faq/faq-item/rules-engines-triggers-dsp-trigger-flow/rules-engines-triggers-dsp-trigger-flow.component';
import { RulesEnginesTriggersRecursiveUpdateTriggersComponent } from './faq/faq-item/rules-engines-triggers-recursive-update-triggers/rules-engines-triggers-recursive-update-triggers.component';
import { RulesEnginesTriggersTriggerExecutionOrderComponent } from './faq/faq-item/rules-engines-triggers-trigger-execution-order/rules-engines-triggers-trigger-execution-order.component';
import { RulesEnginesTriggersTriggerAccessComponent } from './faq/faq-item/rules-engines-triggers-trigger-access/rules-engines-triggers-trigger-access.component';
import { RulesEnginesTriggersTestCoverageTriggerComponent } from './faq/faq-item/rules-engines-triggers-test-coverage-trigger/rules-engines-triggers-test-coverage-trigger.component';
import { RulesEnginesTriggersTriggerFlipperComponent } from './faq/faq-item/rules-engines-triggers-trigger-flipper/rules-engines-triggers-trigger-flipper.component';
import { ProcessStepsRetrieveRetrieveActionComponent } from './faq/faq-item/process-steps-retrieve-retrieve-action/process-steps-retrieve-retrieve-action.component';
import { ProcessStepsRetrieveRetrieveQueryFieldRequirementsComponent } from './faq/faq-item/process-steps-retrieve-retrieve-query-field-requirements/process-steps-retrieve-retrieve-query-field-requirements.component';
import { ProcessStepsRetrievePreviewSourceRecordComponent } from './faq/faq-item/process-steps-retrieve-preview-source-record/process-steps-retrieve-preview-source-record.component';
import { ProcessStepsRetrieveAdditionalRetrieveCriteriaComponent } from './faq/faq-item/process-steps-retrieve-additional-retrieve-criteria/process-steps-retrieve-additional-retrieve-criteria.component';
import { ProcessStepsPreviewPreviewOverviewComponent } from './faq/faq-item/process-steps-preview-preview-overview/process-steps-preview-preview-overview.component';
import { ProcessStepsPreviewPreviewSourceRecordComponent } from './faq/faq-item/process-steps-preview-preview-source-record/process-steps-preview-preview-source-record.component';
import { ProcessStepsPreviewPreviewVsRetrieveComponent } from './faq/faq-item/process-steps-preview-preview-vs-retrieve/process-steps-preview-preview-vs-retrieve.component';
import { ProcessStepsInputInputActionComponent } from './faq/faq-item/process-steps-input-input-action/process-steps-input-input-action.component';
import { ProcessStepsInputDefineInputDataProfileComponent } from './faq/faq-item/process-steps-input-define-input-data-profile/process-steps-input-define-input-data-profile.component';
import { ProcessStepsInputDataLoaderColumnFormatComponent } from './faq/faq-item/process-steps-input-data-loader-column-format/process-steps-input-data-loader-column-format.component';
import { ProcessStepsInputInputDataKeyFieldComponent } from './faq/faq-item/process-steps-input-input-data-key-field/process-steps-input-input-data-key-field.component';
import { ProcessStepsScopingScopingActionComponent } from './faq/faq-item/process-steps-scoping-scoping-action/process-steps-scoping-scoping-action.component';
import { ProcessStepsScopingScopeFilterComponent } from './faq/faq-item/process-steps-scoping-scope-filter/process-steps-scoping-scope-filter.component';
import { ProcessStepsScopingAvoidDuplicateSourceComponent } from './faq/faq-item/process-steps-scoping-avoid-duplicate-source/process-steps-scoping-avoid-duplicate-source.component';
import { ProcessStepsScopingJoinSourceDataComponent } from './faq/faq-item/process-steps-scoping-join-source-data/process-steps-scoping-join-source-data.component';
import { ProcessStepsMatchMatchActionComponent } from './faq/faq-item/process-steps-match-match-action/process-steps-match-match-action.component';
import { ProcessStepsMatchMultipleTargetRecordsComponent } from './faq/faq-item/process-steps-match-multiple-target-records/process-steps-match-multiple-target-records.component';
import { ProcessStepsMatchInsertDuplicateCheckComponent } from './faq/faq-item/process-steps-match-insert-duplicate-check/process-steps-match-insert-duplicate-check.component';
import { ProcessStepsMatchUpsertMatchProcessComponent } from './faq/faq-item/process-steps-match-upsert-match-process/process-steps-match-upsert-match-process.component';
import { ProcessStepsMatchMultiFieldMatchComponent } from './faq/faq-item/process-steps-match-multi-field-match/process-steps-match-multi-field-match.component';
import { ProcessStepsMatchMultipleSourceSameTargetComponent } from './faq/faq-item/process-steps-match-multiple-source-same-target/process-steps-match-multiple-source-same-target.component';
import { ProcessStepsMatchMatchMergePrincipalComponent } from './faq/faq-item/process-steps-match-match-merge-principal/process-steps-match-match-merge-principal.component';
import { ProcessStepsMatchRelationalFieldMatchComponent } from './faq/faq-item/process-steps-match-relational-field-match/process-steps-match-relational-field-match.component';
import { ProcessStepsMatchAdditionalTargetMatchingComponent } from './faq/faq-item/process-steps-match-additional-target-matching/process-steps-match-additional-target-matching.component';
import { ProcessStepsMatchMatchedRecordsSortingComponent } from './faq/faq-item/process-steps-match-matched-records-sorting/process-steps-match-matched-records-sorting.component';
import { ProcessStepsMappingMappingActionComponent } from './faq/faq-item/process-steps-mapping-mapping-action/process-steps-mapping-mapping-action.component';
import { ProcessStepsMappingMappingParentRelationshipComponent } from './faq/faq-item/process-steps-mapping-mapping-parent-relationship/process-steps-mapping-mapping-parent-relationship.component';
import { ProcessStepsMappingDspRelationshipManagementComponent } from './faq/faq-item/process-steps-mapping-dsp-relationship-management/process-steps-mapping-dsp-relationship-management.component';
import { ProcessStepsMappingSequenceOfTransformationsComponent } from './faq/faq-item/process-steps-mapping-sequence-of-transformations/process-steps-mapping-sequence-of-transformations.component';
import { ProcessStepsMappingAddDefaultButtonComponent } from './faq/faq-item/process-steps-mapping-add-default-button/process-steps-mapping-add-default-button.component';
import { ProcessStepsMappingClearMappingsButtonComponent } from './faq/faq-item/process-steps-mapping-clear-mappings-button/process-steps-mapping-clear-mappings-button.component';
import { ProcessStepsMappingUnmappedSourceFieldsButtonComponent } from './faq/faq-item/process-steps-mapping-unmapped-source-fields-button/process-steps-mapping-unmapped-source-fields-button.component';
import { ProcessStepsMappingRefreshButtonComponent } from './faq/faq-item/process-steps-mapping-refresh-button/process-steps-mapping-refresh-button.component';
import { ProcessStepsMappingSaveButtonComponent } from './faq/faq-item/process-steps-mapping-save-button/process-steps-mapping-save-button.component';
import { ProcessStepsActionActionPhaseComponent } from './faq/faq-item/process-steps-action-action-phase/process-steps-action-action-phase.component';
import { ProcessStepsActionWhichActionsSupportedComponent } from './faq/faq-item/process-steps-action-which-actions-supported/process-steps-action-which-actions-supported.component';
import { ProcessStepsActionAvoidDuplicatesComponent } from './faq/faq-item/process-steps-action-avoid-duplicates/process-steps-action-avoid-duplicates.component';
import { ProcessStepsActionImplementDeltaUpdateComponent } from './faq/faq-item/process-steps-action-implement-delta-update/process-steps-action-implement-delta-update.component';
import { ProcessStepsActionSkipUpdateIfExistsComponent } from './faq/faq-item/process-steps-action-skip-update-if-exists/process-steps-action-skip-update-if-exists.component';
import { ProcessStepsActionSkipUpdateIfBlankComponent } from './faq/faq-item/process-steps-action-skip-update-if-blank/process-steps-action-skip-update-if-blank.component';
import { ProcessStepsActionSourceObjectWritebackComponent } from './faq/faq-item/process-steps-action-source-object-writeback/process-steps-action-source-object-writeback.component';
import { ProcessStepsActionUseUpsertApiFieldComponent } from './faq/faq-item/process-steps-action-use-upsert-api-field/process-steps-action-use-upsert-api-field.component';
import { ProcessStepsActionActionBigObjectsComponent } from './faq/faq-item/process-steps-action-action-big-objects/process-steps-action-action-big-objects.component';
import { ProcessStepsActionActionPlatformEventsComponent } from './faq/faq-item/process-steps-action-action-platform-events/process-steps-action-action-platform-events.component';
import { ProcessStepsVerifyVerifyPhaseComponent } from './faq/faq-item/process-steps-verify-verify-phase/process-steps-verify-verify-phase.component';
import { ProcessStepsVerifyVerifyBatchOnlyComponent } from './faq/faq-item/process-steps-verify-verify-batch-only/process-steps-verify-verify-batch-only.component';
import { ProcessStepsVerifyVerifyWithBulkApiComponent } from './faq/faq-item/process-steps-verify-verify-with-bulk-api/process-steps-verify-verify-with-bulk-api.component';
import { TransformationBulkifiedTransformationEssentialComponent } from './faq/faq-item/transformation-bulkified-transformation-essential/transformation-bulkified-transformation-essential.component';
import { TransformationFormulaDataTypesComponent } from './faq/faq-item/transformation-formula-data-types/transformation-formula-data-types.component';
import { TransformationFormulaUsageComponent } from './faq/faq-item/transformation-formula-usage/transformation-formula-usage.component';
import { TransformationNestedFormulasComponent } from './faq/faq-item/transformation-nested-formulas/transformation-nested-formulas.component';
import { TransformationDspRelationshipManagementComponent } from './faq/faq-item/transformation-dsp-relationship-management/transformation-dsp-relationship-management.component';
import { TransformationOptimizeVlookupAggComponent } from './faq/faq-item/transformation-optimize-vlookup-agg/transformation-optimize-vlookup-agg.component';
import { TransformationHandleComplexTransformationsComponent } from './faq/faq-item/transformation-handle-complex-transformations/transformation-handle-complex-transformations.component';
import { TransformationDefineReusableFormulaComponent } from './faq/faq-item/transformation-define-reusable-formula/transformation-define-reusable-formula.component';
import { TransformationJoinSourceDataComponent } from './faq/faq-item/transformation-join-source-data/transformation-join-source-data.component';
import { TransformationPerformDataMaskingComponent } from './faq/faq-item/transformation-perform-data-masking/transformation-perform-data-masking.component';
import { TransformationSkipFieldIfBlankComponent } from './faq/faq-item/transformation-skip-field-if-blank/transformation-skip-field-if-blank.component';
import { TransformationEliminateDuplicateSourceComponent } from './faq/faq-item/transformation-eliminate-duplicate-source/transformation-eliminate-duplicate-source.component';
import { TransformationEvaluateExpressionsApexComponent } from './faq/faq-item/transformation-evaluate-expressions-apex/transformation-evaluate-expressions-apex.component';
import { TransformationDynamicStringFormatComponent } from './faq/faq-item/transformation-dynamic-string-format/transformation-dynamic-string-format.component';
import { QueryManagerqWhatIsQueryManagerComponent } from './faq/faq-item/query-managerq-what-is-query-manager/query-managerq-what-is-query-manager.component';
import { QueryManagerqWhoCanAccessQComponent } from './faq/faq-item/query-managerq-who-can-access-q/query-managerq-who-can-access-q.component';
import { QueryManagerqQueryBuilderConstructionComponent } from './faq/faq-item/query-managerq-query-builder-construction/query-managerq-query-builder-construction.component';
import { QueryManagerqQueryExecutionResultComponent } from './faq/faq-item/query-managerq-query-execution-result/query-managerq-query-execution-result.component';
import { QueryManagerqColumnFilterComponent } from './faq/faq-item/query-managerq-column-filter/query-managerq-column-filter.component';
import { QueryManagerqDynamicFilterComponent } from './faq/faq-item/query-managerq-dynamic-filter/query-managerq-dynamic-filter.component';
import { QueryManagerqQueryOwnerPolymorphicComponent } from './faq/faq-item/query-managerq-query-owner-polymorphic/query-managerq-query-owner-polymorphic.component';
import { QueryManagerqQueryRemoteOrgComponent } from './faq/faq-item/query-managerq-query-remote-org/query-managerq-query-remote-org.component';
import { QueryManagerqIncludeDeletedRecordsComponent } from './faq/faq-item/query-managerq-include-deleted-records/query-managerq-include-deleted-records.component';
import { QueryManagerqRestoreDeletedRecordsComponent } from './faq/faq-item/query-managerq-restore-deleted-records/query-managerq-restore-deleted-records.component';
import { QueryManagerqHyperlinksQueryResultsComponent } from './faq/faq-item/query-managerq-hyperlinks-query-results/query-managerq-hyperlinks-query-results.component';
import { QueryManagerqPaginationHandlingComponent } from './faq/faq-item/query-managerq-pagination-handling/query-managerq-pagination-handling.component';
import { QueryManagerqQToolingApiComponent } from './faq/faq-item/query-managerq-q-tooling-api/query-managerq-q-tooling-api.component';
import { QueryManagerqManageQueriesComponent } from './faq/faq-item/query-managerq-manage-queries/query-managerq-manage-queries.component';
import { QueryManagerqIntegrateQLightningComponent } from './faq/faq-item/query-managerq-integrate-q-lightning/query-managerq-integrate-q-lightning.component';

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
    CreateActionButtonComponent,
    GeneralWhatIsDspComponent,
    GeneralFiveDspEnginesComponent,
    GeneralNoCodeRulesTransformComponent,
    GeneralWhyDspComponent,
    GeneralDspExternalDataComponent,
    GeneralDspSecurityPrivacyComponent,
    GeneralDspLicensingPricingComponent,
    GeneralThreeUserPersonasComponent,
    GeneralDspRulesEnginesCompareComponent,
    GeneralDspTrainingNeededComponent,
    GeneralDspAdheresSdlcComponent,
    GeneralDspGovernorLimitsComponent,
    RulesEnginesBatchWhatIsBatchJobComponent,
    RulesEnginesBatchWhyDspBatchComponent,
    RulesEnginesBatchBatchTechnologiesUsedComponent,
    RulesEnginesBatchBatchUseCasesComponent,
    RulesEnginesBatchBatchLargeVolumesComponent,
    RulesEnginesBatchCreateBatchExecutableComponent,
    RulesEnginesBatchBatchCrossOrgComponent,
    RulesEnginesBatchBatchPermissionsNeededComponent,
    RulesEnginesBatchBatchMaxDatasetComponent,
    RulesEnginesBatchBatchMaxSizeComponent,
    RulesEnginesBatchChainBatchExecutablesComponent,
    RulesEnginesBatchScheduleBatchJobsComponent,
    RulesEnginesBatchStopPipelineOnFailComponent,
    RulesEnginesBatchCommonSoqlPipelineComponent,
    RulesEnginesBatchBatchParentChildComponent,
    RulesEnginesBatchBatchLogsTrackedComponent,
    RulesEnginesBatchReExecuteFailedBatchesComponent,
    RulesEnginesBatchRevertBatchChangesComponent,
    RulesEnginesBatchDeltaRetrievalComponent,
    RulesEnginesBatchBulkApiConsiderationsComponent,
    RulesEnginesBatchBatchNotificationsComponent,
    RulesEnginesBatchTestBatchWithSampleComponent,
    RulesEnginesBatchBreakDownComplexBatchComponent,
    RulesEnginesBatchBlankUpdateBatchAdvantagesComponent,
    RulesEnginesDataListWhatIsDataListComponent,
    RulesEnginesDataListWhyDspDataListComponent,
    RulesEnginesDataListCreateActionableDataListComponent,
    RulesEnginesDataListTwoComponentsDataListComponent,
    RulesEnginesDataListDataListMinReqsComponent,
    RulesEnginesDataListActionableVsNonactionableComponent,
    RulesEnginesDataListDataListPermissionsComponent,
    RulesEnginesDataListEmbedDataListsLightningComponent,
    RulesEnginesDataListCustomizeActionUiComponent,
    RulesEnginesDataListActionConfirmationPromptComponent,
    RulesEnginesDataListSpecifyActionScopeComponent,
    RulesEnginesDataListReviewEditTransformedComponent,
    RulesEnginesDataListGroupDataListsComponent,
    RulesEnginesDataListConsolidateDataListActionsComponent,
    RulesEnginesDataListSpecifyRelatedListsComponent,
    RulesEnginesDataListReplaceNewRecordComponent,
    RulesEnginesDataListDataLoaderListActionComponent,
    RulesEnginesDataListDataListQueryPermissionsComponent,
    RulesEnginesDataListOpenRecordInLightningComponent,
    RulesEnginesDataListEndUserQueryCustomizationComponent,
    RulesEnginesDataListExtendDataListsLwcComponent,
    RulesEnginesDataListHorizontalScrollingDataListComponent,
    RulesEnginesDataListRemoteOrgDataListComponent,
    RulesEnginesActionButtonWhatIsActionButtonComponent,
    RulesEnginesActionButtonWhyDspActionButtonComponent,
    RulesEnginesActionButtonCreateActionButtonComponent,
    RulesEnginesActionButtonCustomizeActionUiComponent,
    RulesEnginesActionButtonActionConfirmationPromptComponent,
    RulesEnginesActionButtonDisplayTransformedValuesComponent,
    RulesEnginesActionButtonGroupActionButtonsComponent,
    RulesEnginesActionButtonSeriesActionsOneClickComponent,
    RulesEnginesActionButtonActionButtonAccessComponent,
    RulesEnginesDataLoaderDataLoaderOverviewComponent,
    RulesEnginesDataLoaderCreateDataLoaderComponent,
    RulesEnginesDataLoaderLoadDataDifferentOrgComponent,
    RulesEnginesDataLoaderDataLoaderLogsComponent,
    RulesEnginesDataLoaderDataLoaderTypeConversionComponent,
    RulesEnginesDataLoaderDataLoaderAccessComponent,
    RulesEnginesDataLoaderDataLoaderCsvOnlyComponent,
    RulesEnginesDataLoaderSerialModeUsageComponent,
    RulesEnginesDataLoaderReExecuteFailedLoadComponent,
    RulesEnginesDataLoaderRevertDataLoadComponent,
    RulesEnginesDataLoaderFailOnMissingColumnComponent,
    RulesEnginesDataLoaderLoaderAsListActionComponent,
    RulesEnginesTriggersTriggerRulesEngineComponent,
    RulesEnginesTriggersWhyDspTriggerComponent,
    RulesEnginesTriggersTriggerEventsSupportedComponent,
    RulesEnginesTriggersSelfAdaptiveTriggerComponent,
    RulesEnginesTriggersSetupSelfAdaptiveTriggerComponent,
    RulesEnginesTriggersAggregationSelfAdaptiveComponent,
    RulesEnginesTriggersValidationSelfAdaptiveComponent,
    RulesEnginesTriggersWhatIsTriggerActionComponent,
    RulesEnginesTriggersSetupTriggerActionComponent,
    RulesEnginesTriggersDspTriggerFlowComponent,
    RulesEnginesTriggersRecursiveUpdateTriggersComponent,
    RulesEnginesTriggersTriggerExecutionOrderComponent,
    RulesEnginesTriggersTriggerAccessComponent,
    RulesEnginesTriggersTestCoverageTriggerComponent,
    RulesEnginesTriggersTriggerFlipperComponent,
    ProcessStepsRetrieveRetrieveActionComponent,
    ProcessStepsRetrieveRetrieveQueryFieldRequirementsComponent,
    ProcessStepsRetrievePreviewSourceRecordComponent,
    ProcessStepsRetrieveAdditionalRetrieveCriteriaComponent,
    ProcessStepsPreviewPreviewOverviewComponent,
    ProcessStepsPreviewPreviewSourceRecordComponent,
    ProcessStepsPreviewPreviewVsRetrieveComponent,
    ProcessStepsInputInputActionComponent,
    ProcessStepsInputDefineInputDataProfileComponent,
    ProcessStepsInputDataLoaderColumnFormatComponent,
    ProcessStepsInputInputDataKeyFieldComponent,
    ProcessStepsScopingScopingActionComponent,
    ProcessStepsScopingScopeFilterComponent,
    ProcessStepsScopingAvoidDuplicateSourceComponent,
    ProcessStepsScopingJoinSourceDataComponent,
    ProcessStepsMatchMatchActionComponent,
    ProcessStepsMatchMultipleTargetRecordsComponent,
    ProcessStepsMatchInsertDuplicateCheckComponent,
    ProcessStepsMatchUpsertMatchProcessComponent,
    ProcessStepsMatchMultiFieldMatchComponent,
    ProcessStepsMatchMultipleSourceSameTargetComponent,
    ProcessStepsMatchMatchMergePrincipalComponent,
    ProcessStepsMatchRelationalFieldMatchComponent,
    ProcessStepsMatchAdditionalTargetMatchingComponent,
    ProcessStepsMatchMatchedRecordsSortingComponent,
    ProcessStepsMappingMappingActionComponent,
    ProcessStepsMappingMappingParentRelationshipComponent,
    ProcessStepsMappingDspRelationshipManagementComponent,
    ProcessStepsMappingSequenceOfTransformationsComponent,
    ProcessStepsMappingAddDefaultButtonComponent,
    ProcessStepsMappingClearMappingsButtonComponent,
    ProcessStepsMappingUnmappedSourceFieldsButtonComponent,
    ProcessStepsMappingRefreshButtonComponent,
    ProcessStepsMappingSaveButtonComponent,
    ProcessStepsActionActionPhaseComponent,
    ProcessStepsActionWhichActionsSupportedComponent,
    ProcessStepsActionAvoidDuplicatesComponent,
    ProcessStepsActionImplementDeltaUpdateComponent,
    ProcessStepsActionSkipUpdateIfExistsComponent,
    ProcessStepsActionSkipUpdateIfBlankComponent,
    ProcessStepsActionSourceObjectWritebackComponent,
    ProcessStepsActionUseUpsertApiFieldComponent,
    ProcessStepsActionActionBigObjectsComponent,
    ProcessStepsActionActionPlatformEventsComponent,
    ProcessStepsVerifyVerifyPhaseComponent,
    ProcessStepsVerifyVerifyBatchOnlyComponent,
    ProcessStepsVerifyVerifyWithBulkApiComponent,
    TransformationBulkifiedTransformationEssentialComponent,
    TransformationFormulaDataTypesComponent,
    TransformationFormulaUsageComponent,
    TransformationNestedFormulasComponent,
    TransformationDspRelationshipManagementComponent,
    TransformationOptimizeVlookupAggComponent,
    TransformationHandleComplexTransformationsComponent,
    TransformationDefineReusableFormulaComponent,
    TransformationJoinSourceDataComponent,
    TransformationPerformDataMaskingComponent,
    TransformationSkipFieldIfBlankComponent,
    TransformationEliminateDuplicateSourceComponent,
    TransformationEvaluateExpressionsApexComponent,
    TransformationDynamicStringFormatComponent,
    QueryManagerqWhatIsQueryManagerComponent,
    QueryManagerqWhoCanAccessQComponent,
    QueryManagerqQueryBuilderConstructionComponent,
    QueryManagerqQueryExecutionResultComponent,
    QueryManagerqColumnFilterComponent,
    QueryManagerqDynamicFilterComponent,
    QueryManagerqQueryOwnerPolymorphicComponent,
    QueryManagerqQueryRemoteOrgComponent,
    QueryManagerqIncludeDeletedRecordsComponent,
    QueryManagerqRestoreDeletedRecordsComponent,
    QueryManagerqHyperlinksQueryResultsComponent,
    QueryManagerqPaginationHandlingComponent,
    QueryManagerqQToolingApiComponent,
    QueryManagerqManageQueriesComponent,
    QueryManagerqIntegrateQLightningComponent
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
