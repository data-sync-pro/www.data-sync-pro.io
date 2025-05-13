// file: src/app/faq/faq.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

/* If you need Material or other modules for your FAQ components, import them here: */
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

/* Import all your FAQ components: */
import { FaqComponent } from './faq.component';
import { GeneralWhatIsDspComponent } from './faq-item/general-what-is-dsp/general-what-is-dsp.component';
import { GeneralFiveDspEnginesComponent } from './faq-item/general-five-dsp-engines/general-five-dsp-engines.component';
import { GeneralNoCodeRulesTransformComponent } from './faq-item/general-no-code-rules-transform/general-no-code-rules-transform.component';
import { GeneralWhyDspComponent } from './faq-item/general-why-dsp/general-why-dsp.component';
import { GeneralDspExternalDataComponent } from './faq-item/general-dsp-external-data/general-dsp-external-data.component';
import { GeneralDspSecurityPrivacyComponent } from './faq-item/general-dsp-security-privacy/general-dsp-security-privacy.component';
import { GeneralDspLicensingPricingComponent } from './faq-item/general-dsp-licensing-pricing/general-dsp-licensing-pricing.component';
import { GeneralThreeUserPersonasComponent } from './faq-item/general-three-user-personas/general-three-user-personas.component';
import { GeneralDspRulesEnginesCompareComponent } from './faq-item/general-dsp-rules-engines-compare/general-dsp-rules-engines-compare.component';
import { GeneralDspTrainingNeededComponent } from './faq-item/general-dsp-training-needed/general-dsp-training-needed.component';
import { GeneralDspAdheresSdlcComponent } from './faq-item/general-dsp-adheres-sdlc/general-dsp-adheres-sdlc.component';
import { GeneralDspGovernorLimitsComponent } from './faq-item/general-dsp-governor-limits/general-dsp-governor-limits.component';
import { RulesEnginesBatchWhatIsBatchJobComponent } from './faq-item/rules-engines-batch-what-is-batch-job/rules-engines-batch-what-is-batch-job.component';
import { RulesEnginesBatchWhyDspBatchComponent } from './faq-item/rules-engines-batch-why-dsp-batch/rules-engines-batch-why-dsp-batch.component';
import { RulesEnginesBatchBatchTechnologiesUsedComponent } from './faq-item/rules-engines-batch-batch-technologies-used/rules-engines-batch-batch-technologies-used.component';
import { RulesEnginesBatchBatchUseCasesComponent } from './faq-item/rules-engines-batch-batch-use-cases/rules-engines-batch-batch-use-cases.component';
import { RulesEnginesBatchBatchLargeVolumesComponent } from './faq-item/rules-engines-batch-batch-large-volumes/rules-engines-batch-batch-large-volumes.component';
import { RulesEnginesBatchCreateBatchExecutableComponent } from './faq-item/rules-engines-batch-create-batch-executable/rules-engines-batch-create-batch-executable.component';
import { RulesEnginesBatchBatchCrossOrgComponent } from './faq-item/rules-engines-batch-batch-cross-org/rules-engines-batch-batch-cross-org.component';
import { RulesEnginesBatchBatchPermissionsNeededComponent } from './faq-item/rules-engines-batch-batch-permissions-needed/rules-engines-batch-batch-permissions-needed.component';
import { RulesEnginesBatchBatchMaxDatasetComponent } from './faq-item/rules-engines-batch-batch-max-dataset/rules-engines-batch-batch-max-dataset.component';
import { RulesEnginesBatchBatchMaxSizeComponent } from './faq-item/rules-engines-batch-batch-max-size/rules-engines-batch-batch-max-size.component';
import { RulesEnginesBatchChainBatchExecutablesComponent } from './faq-item/rules-engines-batch-chain-batch-executables/rules-engines-batch-chain-batch-executables.component';
import { RulesEnginesBatchScheduleBatchJobsComponent } from './faq-item/rules-engines-batch-schedule-batch-jobs/rules-engines-batch-schedule-batch-jobs.component';
import { RulesEnginesBatchStopPipelineOnFailComponent } from './faq-item/rules-engines-batch-stop-pipeline-on-fail/rules-engines-batch-stop-pipeline-on-fail.component';
import { RulesEnginesBatchCommonSoqlPipelineComponent } from './faq-item/rules-engines-batch-common-soql-pipeline/rules-engines-batch-common-soql-pipeline.component';
import { RulesEnginesBatchBatchParentChildComponent } from './faq-item/rules-engines-batch-batch-parent-child/rules-engines-batch-batch-parent-child.component';
import { RulesEnginesBatchBatchLogsTrackedComponent } from './faq-item/rules-engines-batch-batch-logs-tracked/rules-engines-batch-batch-logs-tracked.component';
import { RulesEnginesBatchReExecuteFailedBatchesComponent } from './faq-item/rules-engines-batch-re-execute-failed-batches/rules-engines-batch-re-execute-failed-batches.component';
import { RulesEnginesBatchRevertBatchChangesComponent } from './faq-item/rules-engines-batch-revert-batch-changes/rules-engines-batch-revert-batch-changes.component';
import { RulesEnginesBatchDeltaRetrievalComponent } from './faq-item/rules-engines-batch-delta-retrieval/rules-engines-batch-delta-retrieval.component';
import { RulesEnginesBatchBulkApiConsiderationsComponent } from './faq-item/rules-engines-batch-bulk-api-considerations/rules-engines-batch-bulk-api-considerations.component';
import { RulesEnginesBatchBatchNotificationsComponent } from './faq-item/rules-engines-batch-batch-notifications/rules-engines-batch-batch-notifications.component';
import { RulesEnginesBatchTestBatchWithSampleComponent } from './faq-item/rules-engines-batch-test-batch-with-sample/rules-engines-batch-test-batch-with-sample.component';
import { RulesEnginesBatchBreakDownComplexBatchComponent } from './faq-item/rules-engines-batch-break-down-complex-batch/rules-engines-batch-break-down-complex-batch.component';
import { RulesEnginesBatchBlankUpdateBatchAdvantagesComponent } from './faq-item/rules-engines-batch-blank-update-batch-advantages/rules-engines-batch-blank-update-batch-advantages.component';
import { RulesEnginesDataListWhatIsDataListComponent } from './faq-item/rules-engines-data-list-what-is-data-list/rules-engines-data-list-what-is-data-list.component';
import { RulesEnginesDataListWhyDspDataListComponent } from './faq-item/rules-engines-data-list-why-dsp-data-list/rules-engines-data-list-why-dsp-data-list.component';
import { RulesEnginesDataListCreateActionableDataListComponent } from './faq-item/rules-engines-data-list-create-actionable-data-list/rules-engines-data-list-create-actionable-data-list.component';
import { RulesEnginesDataListTwoComponentsDataListComponent } from './faq-item/rules-engines-data-list-two-components-data-list/rules-engines-data-list-two-components-data-list.component';
import { RulesEnginesDataListDataListMinReqsComponent } from './faq-item/rules-engines-data-list-data-list-min-reqs/rules-engines-data-list-data-list-min-reqs.component';
import { RulesEnginesDataListActionableVsNonactionableComponent } from './faq-item/rules-engines-data-list-actionable-vs-nonactionable/rules-engines-data-list-actionable-vs-nonactionable.component';
import { RulesEnginesDataListDataListPermissionsComponent } from './faq-item/rules-engines-data-list-data-list-permissions/rules-engines-data-list-data-list-permissions.component';
import { RulesEnginesDataListEmbedDataListsLightningComponent } from './faq-item/rules-engines-data-list-embed-data-lists-lightning/rules-engines-data-list-embed-data-lists-lightning.component';
import { RulesEnginesDataListCustomizeActionUiComponent } from './faq-item/rules-engines-data-list-customize-action-ui/rules-engines-data-list-customize-action-ui.component';
import { RulesEnginesDataListActionConfirmationPromptComponent } from './faq-item/rules-engines-data-list-action-confirmation-prompt/rules-engines-data-list-action-confirmation-prompt.component';
import { RulesEnginesDataListSpecifyActionScopeComponent } from './faq-item/rules-engines-data-list-specify-action-scope/rules-engines-data-list-specify-action-scope.component';
import { RulesEnginesDataListReviewEditTransformedComponent } from './faq-item/rules-engines-data-list-review-edit-transformed/rules-engines-data-list-review-edit-transformed.component';
import { RulesEnginesDataListGroupDataListsComponent } from './faq-item/rules-engines-data-list-group-data-lists/rules-engines-data-list-group-data-lists.component';
import { RulesEnginesDataListConsolidateDataListActionsComponent } from './faq-item/rules-engines-data-list-consolidate-data-list-actions/rules-engines-data-list-consolidate-data-list-actions.component';
import { RulesEnginesDataListSpecifyRelatedListsComponent } from './faq-item/rules-engines-data-list-specify-related-lists/rules-engines-data-list-specify-related-lists.component';
import { RulesEnginesDataListReplaceNewRecordComponent } from './faq-item/rules-engines-data-list-replace-new-record/rules-engines-data-list-replace-new-record.component';
import { RulesEnginesDataListDataLoaderListActionComponent } from './faq-item/rules-engines-data-list-data-loader-list-action/rules-engines-data-list-data-loader-list-action.component';
import { RulesEnginesDataListDataListQueryPermissionsComponent } from './faq-item/rules-engines-data-list-data-list-query-permissions/rules-engines-data-list-data-list-query-permissions.component';
import { RulesEnginesDataListOpenRecordInLightningComponent } from './faq-item/rules-engines-data-list-open-record-in-lightning/rules-engines-data-list-open-record-in-lightning.component';
import { RulesEnginesDataListEndUserQueryCustomizationComponent } from './faq-item/rules-engines-data-list-end-user-query-customization/rules-engines-data-list-end-user-query-customization.component';
import { RulesEnginesDataListExtendDataListsLwcComponent } from './faq-item/rules-engines-data-list-extend-data-lists-lwc/rules-engines-data-list-extend-data-lists-lwc.component';
import { RulesEnginesDataListHorizontalScrollingDataListComponent } from './faq-item/rules-engines-data-list-horizontal-scrolling-data-list/rules-engines-data-list-horizontal-scrolling-data-list.component';
import { RulesEnginesDataListRemoteOrgDataListComponent } from './faq-item/rules-engines-data-list-remote-org-data-list/rules-engines-data-list-remote-org-data-list.component';
import { RulesEnginesActionButtonWhatIsActionButtonComponent } from './faq-item/rules-engines-action-button-what-is-action-button/rules-engines-action-button-what-is-action-button.component';
import { RulesEnginesActionButtonWhyDspActionButtonComponent } from './faq-item/rules-engines-action-button-why-dsp-action-button/rules-engines-action-button-why-dsp-action-button.component';
import { RulesEnginesActionButtonCreateActionButtonComponent } from './faq-item/rules-engines-action-button-create-action-button/rules-engines-action-button-create-action-button.component';
import { RulesEnginesActionButtonCustomizeActionUiComponent } from './faq-item/rules-engines-action-button-customize-action-ui/rules-engines-action-button-customize-action-ui.component';
import { RulesEnginesActionButtonActionConfirmationPromptComponent } from './faq-item/rules-engines-action-button-action-confirmation-prompt/rules-engines-action-button-action-confirmation-prompt.component';
import { RulesEnginesActionButtonDisplayTransformedValuesComponent } from './faq-item/rules-engines-action-button-display-transformed-values/rules-engines-action-button-display-transformed-values.component';
import { RulesEnginesActionButtonGroupActionButtonsComponent } from './faq-item/rules-engines-action-button-group-action-buttons/rules-engines-action-button-group-action-buttons.component';
import { RulesEnginesActionButtonSeriesActionsOneClickComponent } from './faq-item/rules-engines-action-button-series-actions-one-click/rules-engines-action-button-series-actions-one-click.component';
import { RulesEnginesActionButtonActionButtonAccessComponent } from './faq-item/rules-engines-action-button-action-button-access/rules-engines-action-button-action-button-access.component';
import { RulesEnginesDataLoaderDataLoaderOverviewComponent } from './faq-item/rules-engines-data-loader-data-loader-overview/rules-engines-data-loader-data-loader-overview.component';
import { RulesEnginesDataLoaderCreateDataLoaderComponent } from './faq-item/rules-engines-data-loader-create-data-loader/rules-engines-data-loader-create-data-loader.component';
import { RulesEnginesDataLoaderLoadDataDifferentOrgComponent } from './faq-item/rules-engines-data-loader-load-data-different-org/rules-engines-data-loader-load-data-different-org.component';
import { RulesEnginesDataLoaderDataLoaderLogsComponent } from './faq-item/rules-engines-data-loader-data-loader-logs/rules-engines-data-loader-data-loader-logs.component';
import { RulesEnginesDataLoaderDataLoaderTypeConversionComponent } from './faq-item/rules-engines-data-loader-data-loader-type-conversion/rules-engines-data-loader-data-loader-type-conversion.component';
import { RulesEnginesDataLoaderDataLoaderAccessComponent } from './faq-item/rules-engines-data-loader-data-loader-access/rules-engines-data-loader-data-loader-access.component';
import { RulesEnginesDataLoaderDataLoaderCsvOnlyComponent } from './faq-item/rules-engines-data-loader-data-loader-csv-only/rules-engines-data-loader-data-loader-csv-only.component';
import { RulesEnginesDataLoaderSerialModeUsageComponent } from './faq-item/rules-engines-data-loader-serial-mode-usage/rules-engines-data-loader-serial-mode-usage.component';
import { RulesEnginesDataLoaderReExecuteFailedLoadComponent } from './faq-item/rules-engines-data-loader-re-execute-failed-load/rules-engines-data-loader-re-execute-failed-load.component';
import { RulesEnginesDataLoaderRevertDataLoadComponent } from './faq-item/rules-engines-data-loader-revert-data-load/rules-engines-data-loader-revert-data-load.component';
import { RulesEnginesDataLoaderFailOnMissingColumnComponent } from './faq-item/rules-engines-data-loader-fail-on-missing-column/rules-engines-data-loader-fail-on-missing-column.component';
import { RulesEnginesDataLoaderLoaderAsListActionComponent } from './faq-item/rules-engines-data-loader-loader-as-list-action/rules-engines-data-loader-loader-as-list-action.component';
import { RulesEnginesTriggersTriggerRulesEngineComponent } from './faq-item/rules-engines-triggers-trigger-rules-engine/rules-engines-triggers-trigger-rules-engine.component';
import { RulesEnginesTriggersWhyDspTriggerComponent } from './faq-item/rules-engines-triggers-why-dsp-trigger/rules-engines-triggers-why-dsp-trigger.component';
import { RulesEnginesTriggersTriggerEventsSupportedComponent } from './faq-item/rules-engines-triggers-trigger-events-supported/rules-engines-triggers-trigger-events-supported.component';
import { RulesEnginesTriggersSelfAdaptiveTriggerComponent } from './faq-item/rules-engines-triggers-self-adaptive-trigger/rules-engines-triggers-self-adaptive-trigger.component';
import { RulesEnginesTriggersSetupSelfAdaptiveTriggerComponent } from './faq-item/rules-engines-triggers-setup-self-adaptive-trigger/rules-engines-triggers-setup-self-adaptive-trigger.component';
import { RulesEnginesTriggersAggregationSelfAdaptiveComponent } from './faq-item/rules-engines-triggers-aggregation-self-adaptive/rules-engines-triggers-aggregation-self-adaptive.component';
import { RulesEnginesTriggersValidationSelfAdaptiveComponent } from './faq-item/rules-engines-triggers-validation-self-adaptive/rules-engines-triggers-validation-self-adaptive.component';
import { RulesEnginesTriggersWhatIsTriggerActionComponent } from './faq-item/rules-engines-triggers-what-is-trigger-action/rules-engines-triggers-what-is-trigger-action.component';
import { RulesEnginesTriggersSetupTriggerActionComponent } from './faq-item/rules-engines-triggers-setup-trigger-action/rules-engines-triggers-setup-trigger-action.component';
import { RulesEnginesTriggersDspTriggerFlowComponent } from './faq-item/rules-engines-triggers-dsp-trigger-flow/rules-engines-triggers-dsp-trigger-flow.component';
import { RulesEnginesTriggersRecursiveUpdateTriggersComponent } from './faq-item/rules-engines-triggers-recursive-update-triggers/rules-engines-triggers-recursive-update-triggers.component';
import { RulesEnginesTriggersTriggerExecutionOrderComponent } from './faq-item/rules-engines-triggers-trigger-execution-order/rules-engines-triggers-trigger-execution-order.component';
import { RulesEnginesTriggersTriggerAccessComponent } from './faq-item/rules-engines-triggers-trigger-access/rules-engines-triggers-trigger-access.component';
import { RulesEnginesTriggersTestCoverageTriggerComponent } from './faq-item/rules-engines-triggers-test-coverage-trigger/rules-engines-triggers-test-coverage-trigger.component';
import { RulesEnginesTriggersTriggerFlipperComponent } from './faq-item/rules-engines-triggers-trigger-flipper/rules-engines-triggers-trigger-flipper.component';
import { ProcessStepsRetrieveRetrieveActionComponent } from './faq-item/process-steps-retrieve-retrieve-action/process-steps-retrieve-retrieve-action.component';
import { ProcessStepsRetrieveRetrieveQueryFieldRequirementsComponent } from './faq-item/process-steps-retrieve-retrieve-query-field-requirements/process-steps-retrieve-retrieve-query-field-requirements.component';
import { ProcessStepsRetrievePreviewSourceRecordComponent } from './faq-item/process-steps-retrieve-preview-source-record/process-steps-retrieve-preview-source-record.component';
import { ProcessStepsRetrieveAdditionalRetrieveCriteriaComponent } from './faq-item/process-steps-retrieve-additional-retrieve-criteria/process-steps-retrieve-additional-retrieve-criteria.component';
import { ProcessStepsPreviewPreviewOverviewComponent } from './faq-item/process-steps-preview-preview-overview/process-steps-preview-preview-overview.component';
import { ProcessStepsPreviewPreviewSourceRecordComponent } from './faq-item/process-steps-preview-preview-source-record/process-steps-preview-preview-source-record.component';
import { ProcessStepsPreviewPreviewVsRetrieveComponent } from './faq-item/process-steps-preview-preview-vs-retrieve/process-steps-preview-preview-vs-retrieve.component';
import { ProcessStepsInputInputActionComponent } from './faq-item/process-steps-input-input-action/process-steps-input-input-action.component';
import { ProcessStepsInputDefineInputDataProfileComponent } from './faq-item/process-steps-input-define-input-data-profile/process-steps-input-define-input-data-profile.component';
import { ProcessStepsInputDataLoaderColumnFormatComponent } from './faq-item/process-steps-input-data-loader-column-format/process-steps-input-data-loader-column-format.component';
import { ProcessStepsInputInputDataKeyFieldComponent } from './faq-item/process-steps-input-input-data-key-field/process-steps-input-input-data-key-field.component';
import { ProcessStepsScopingScopingActionComponent } from './faq-item/process-steps-scoping-scoping-action/process-steps-scoping-scoping-action.component';
import { ProcessStepsScopingScopeFilterComponent } from './faq-item/process-steps-scoping-scope-filter/process-steps-scoping-scope-filter.component';
import { ProcessStepsScopingAvoidDuplicateSourceComponent } from './faq-item/process-steps-scoping-avoid-duplicate-source/process-steps-scoping-avoid-duplicate-source.component';
import { ProcessStepsScopingJoinSourceDataComponent } from './faq-item/process-steps-scoping-join-source-data/process-steps-scoping-join-source-data.component';
import { ProcessStepsMatchMatchActionComponent } from './faq-item/process-steps-match-match-action/process-steps-match-match-action.component';
import { ProcessStepsMatchMultipleTargetRecordsComponent } from './faq-item/process-steps-match-multiple-target-records/process-steps-match-multiple-target-records.component';
import { ProcessStepsMatchInsertDuplicateCheckComponent } from './faq-item/process-steps-match-insert-duplicate-check/process-steps-match-insert-duplicate-check.component';
import { ProcessStepsMatchUpsertMatchProcessComponent } from './faq-item/process-steps-match-upsert-match-process/process-steps-match-upsert-match-process.component';
import { ProcessStepsMatchMultiFieldMatchComponent } from './faq-item/process-steps-match-multi-field-match/process-steps-match-multi-field-match.component';
import { ProcessStepsMatchMultipleSourceSameTargetComponent } from './faq-item/process-steps-match-multiple-source-same-target/process-steps-match-multiple-source-same-target.component';
import { ProcessStepsMatchMatchMergePrincipalComponent } from './faq-item/process-steps-match-match-merge-principal/process-steps-match-match-merge-principal.component';
import { ProcessStepsMatchRelationalFieldMatchComponent } from './faq-item/process-steps-match-relational-field-match/process-steps-match-relational-field-match.component';
import { ProcessStepsMatchAdditionalTargetMatchingComponent } from './faq-item/process-steps-match-additional-target-matching/process-steps-match-additional-target-matching.component';
import { ProcessStepsMatchMatchedRecordsSortingComponent } from './faq-item/process-steps-match-matched-records-sorting/process-steps-match-matched-records-sorting.component';
import { ProcessStepsMappingMappingActionComponent } from './faq-item/process-steps-mapping-mapping-action/process-steps-mapping-mapping-action.component';
import { ProcessStepsMappingMappingParentRelationshipComponent } from './faq-item/process-steps-mapping-mapping-parent-relationship/process-steps-mapping-mapping-parent-relationship.component';
import { ProcessStepsMappingDspRelationshipManagementComponent } from './faq-item/process-steps-mapping-dsp-relationship-management/process-steps-mapping-dsp-relationship-management.component';
import { ProcessStepsMappingSequenceOfTransformationsComponent } from './faq-item/process-steps-mapping-sequence-of-transformations/process-steps-mapping-sequence-of-transformations.component';
import { ProcessStepsMappingAddDefaultButtonComponent } from './faq-item/process-steps-mapping-add-default-button/process-steps-mapping-add-default-button.component';
import { ProcessStepsMappingClearMappingsButtonComponent } from './faq-item/process-steps-mapping-clear-mappings-button/process-steps-mapping-clear-mappings-button.component';
import { ProcessStepsMappingUnmappedSourceFieldsButtonComponent } from './faq-item/process-steps-mapping-unmapped-source-fields-button/process-steps-mapping-unmapped-source-fields-button.component';
import { ProcessStepsMappingRefreshButtonComponent } from './faq-item/process-steps-mapping-refresh-button/process-steps-mapping-refresh-button.component';
import { ProcessStepsMappingSaveButtonComponent } from './faq-item/process-steps-mapping-save-button/process-steps-mapping-save-button.component';
import { ProcessStepsActionActionPhaseComponent } from './faq-item/process-steps-action-action-phase/process-steps-action-action-phase.component';
import { ProcessStepsActionWhichActionsSupportedComponent } from './faq-item/process-steps-action-which-actions-supported/process-steps-action-which-actions-supported.component';
import { ProcessStepsActionAvoidDuplicatesComponent } from './faq-item/process-steps-action-avoid-duplicates/process-steps-action-avoid-duplicates.component';
import { ProcessStepsActionImplementDeltaUpdateComponent } from './faq-item/process-steps-action-implement-delta-update/process-steps-action-implement-delta-update.component';
import { ProcessStepsActionSkipUpdateIfExistsComponent } from './faq-item/process-steps-action-skip-update-if-exists/process-steps-action-skip-update-if-exists.component';
import { ProcessStepsActionSkipUpdateIfBlankComponent } from './faq-item/process-steps-action-skip-update-if-blank/process-steps-action-skip-update-if-blank.component';
import { ProcessStepsActionSourceObjectWritebackComponent } from './faq-item/process-steps-action-source-object-writeback/process-steps-action-source-object-writeback.component';
import { ProcessStepsActionUseUpsertApiFieldComponent } from './faq-item/process-steps-action-use-upsert-api-field/process-steps-action-use-upsert-api-field.component';
import { ProcessStepsActionActionBigObjectsComponent } from './faq-item/process-steps-action-action-big-objects/process-steps-action-action-big-objects.component';
import { ProcessStepsActionActionPlatformEventsComponent } from './faq-item/process-steps-action-action-platform-events/process-steps-action-action-platform-events.component';
import { ProcessStepsVerifyVerifyPhaseComponent } from './faq-item/process-steps-verify-verify-phase/process-steps-verify-verify-phase.component';
import { ProcessStepsVerifyVerifyBatchOnlyComponent } from './faq-item/process-steps-verify-verify-batch-only/process-steps-verify-verify-batch-only.component';
import { ProcessStepsVerifyVerifyWithBulkApiComponent } from './faq-item/process-steps-verify-verify-with-bulk-api/process-steps-verify-verify-with-bulk-api.component';
import { TransformationBulkifiedTransformationEssentialComponent } from './faq-item/transformation-bulkified-transformation-essential/transformation-bulkified-transformation-essential.component';
import { TransformationFormulaDataTypesComponent } from './faq-item/transformation-formula-data-types/transformation-formula-data-types.component';
import { TransformationFormulaUsageComponent } from './faq-item/transformation-formula-usage/transformation-formula-usage.component';
import { TransformationNestedFormulasComponent } from './faq-item/transformation-nested-formulas/transformation-nested-formulas.component';
import { TransformationDspRelationshipManagementComponent } from './faq-item/transformation-dsp-relationship-management/transformation-dsp-relationship-management.component';
import { TransformationOptimizeVlookupAggComponent } from './faq-item/transformation-optimize-vlookup-agg/transformation-optimize-vlookup-agg.component';
import { TransformationHandleComplexTransformationsComponent } from './faq-item/transformation-handle-complex-transformations/transformation-handle-complex-transformations.component';
import { TransformationDefineReusableFormulaComponent } from './faq-item/transformation-define-reusable-formula/transformation-define-reusable-formula.component';
import { TransformationJoinSourceDataComponent } from './faq-item/transformation-join-source-data/transformation-join-source-data.component';
import { TransformationPerformDataMaskingComponent } from './faq-item/transformation-perform-data-masking/transformation-perform-data-masking.component';
import { TransformationSkipFieldIfBlankComponent } from './faq-item/transformation-skip-field-if-blank/transformation-skip-field-if-blank.component';
import { TransformationEliminateDuplicateSourceComponent } from './faq-item/transformation-eliminate-duplicate-source/transformation-eliminate-duplicate-source.component';
import { TransformationEvaluateExpressionsApexComponent } from './faq-item/transformation-evaluate-expressions-apex/transformation-evaluate-expressions-apex.component';
import { TransformationDynamicStringFormatComponent } from './faq-item/transformation-dynamic-string-format/transformation-dynamic-string-format.component';
import { QueryManagerqWhatIsQueryManagerComponent } from './faq-item/query-managerq-what-is-query-manager/query-managerq-what-is-query-manager.component';
import { QueryManagerqWhoCanAccessQComponent } from './faq-item/query-managerq-who-can-access-q/query-managerq-who-can-access-q.component';
import { QueryManagerqQueryBuilderConstructionComponent } from './faq-item/query-managerq-query-builder-construction/query-managerq-query-builder-construction.component';
import { QueryManagerqQueryExecutionResultComponent } from './faq-item/query-managerq-query-execution-result/query-managerq-query-execution-result.component';
import { QueryManagerqColumnFilterComponent } from './faq-item/query-managerq-column-filter/query-managerq-column-filter.component';
import { QueryManagerqDynamicFilterComponent } from './faq-item/query-managerq-dynamic-filter/query-managerq-dynamic-filter.component';
import { QueryManagerqQueryOwnerPolymorphicComponent } from './faq-item/query-managerq-query-owner-polymorphic/query-managerq-query-owner-polymorphic.component';
import { QueryManagerqQueryRemoteOrgComponent } from './faq-item/query-managerq-query-remote-org/query-managerq-query-remote-org.component';
import { QueryManagerqIncludeDeletedRecordsComponent } from './faq-item/query-managerq-include-deleted-records/query-managerq-include-deleted-records.component';
import { QueryManagerqRestoreDeletedRecordsComponent } from './faq-item/query-managerq-restore-deleted-records/query-managerq-restore-deleted-records.component';
import { QueryManagerqHyperlinksQueryResultsComponent } from './faq-item/query-managerq-hyperlinks-query-results/query-managerq-hyperlinks-query-results.component';
import { QueryManagerqPaginationHandlingComponent } from './faq-item/query-managerq-pagination-handling/query-managerq-pagination-handling.component';
import { QueryManagerqQToolingApiComponent } from './faq-item/query-managerq-q-tooling-api/query-managerq-q-tooling-api.component';
import { QueryManagerqManageQueriesComponent } from './faq-item/query-managerq-manage-queries/query-managerq-manage-queries.component';
import { QueryManagerqIntegrateQLightningComponent } from './faq-item/query-managerq-integrate-q-lightning/query-managerq-integrate-q-lightning.component';
import { SearchOverlayComponent } from '../search-overlay/search-overlay.component';
import { FaqHomeComponent } from './faq-home/faq-home.component';
import { ZoomableDirective } from 'src/app/zoomable.directive';
@NgModule({
  declarations: [
    FaqComponent,
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
    QueryManagerqIntegrateQLightningComponent,
    SearchOverlayComponent,
    FaqHomeComponent,
    ZoomableDirective
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
  ],
  exports: [
    FaqComponent,
    ZoomableDirective
  ]
})
export class FaqModule {}
