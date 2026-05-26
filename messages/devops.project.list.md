# summary

List all DevOps Center projects in a Salesforce org.

# description

Lists all DevOps Center projects available in the specified org by querying the DevopsProject object. Returns project Id, Name, and Description for each project found.

# flags.target-org.summary

Username or alias of the DevOps Center org.

# examples

- List all DevOps Center projects in an org.

      <%= config.bin %> <%= command.id %> --target-org my-devops-org

- List projects using a username.

      <%= config.bin %> <%= command.id %> --target-org devops-center@example.com
