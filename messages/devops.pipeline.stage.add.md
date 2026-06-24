# summary

Add a stage to a DevOps Center pipeline.

# description

Inserts an empty stage before the stage specified by `--next-stage-id`. The new stage doesn't include a branch or environment. Configure them separately after you create the stage.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# flags.pipeline-id.summary

ID of the pipeline where the stage is added.

# flags.name.summary

Name of the pipeline stage, such as Integration, UAT, or Staging.

# flags.next-stage-id.summary

ID of the stage that follows the new stage in the pipeline.

# examples

- Add a Development stage before Integration in a specific pipeline.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --name "Development" --next-stage-id 0Xc000000000002

- Add a QA stage before UAT in a specific pipeline.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0XB000000000001 --name "QA" --next-stage-id 0Xc000000000003

# error.StageNotFound

Stage %s not found in pipeline %s. Check the stage ID and try again.
