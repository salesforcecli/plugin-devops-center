# summary

Delete a stage from a DevOps Center pipeline.

# description

Deletes the specified stage from the pipeline. If the stage sits between two other stages, the predecessor stage is automatically re-linked to the successor so the pipeline chain stays intact.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage.

# flags.stage-id.summary

ID of the stage to delete.

# examples

- Delete a stage from a pipeline:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --stage-id 0Xc000000000002

# error.StageNotFound

Stage %s not found in pipeline %s. Check the stage ID and try again.
