# summary

Get details of a DevOps Center pipeline including its stages, repositories, and connected projects.

# description

Returns full details for a single DevOps Center pipeline: its stages in order, the source code repository and branch associated with each stage, and any connected projects.

# flags.pipeline-id.summary

ID of the DevOps Center pipeline.

# examples

- Get details for a specific pipeline:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --pipeline-id 0Do000000000001
