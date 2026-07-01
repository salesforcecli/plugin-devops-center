# summary

Add a Salesforce environment to a pipeline stage.

# description

This command triggers an OAuth flow to authenticate the environment. A browser window opens automatically for you to log in.

# flags.pipeline-id.summary

ID of the pipeline that contains the stage.

# flags.stage-id.summary

ID of the pipeline stage.

# flags.environment-name.summary

Name of the environment.

# flags.org-type.summary

Type of the Salesforce org. Valid values: Production, Sandbox.

# flags.no-browser.summary

Don't auto-open the browser for OAuth authentication. The redirect URL is printed for manual use.

# examples

- Add a production environment to a stage using its ID:

      <%= config.bin %> <%= command.id %> --target-org my-devops-org --stage-id 0Xp000000000001 --environment-name Production_Org --org-type Production

# info.BrowserOpened

A browser window has been opened for authentication. Log in to the target org to complete the setup.

# info.ManualAuth

Open the following URL in your browser to authenticate the environment:\n%s

# info.WaitingForAuth

Waiting for authentication to complete...

# info.Success

Successfully added environment to the stage.

# error.StageNotFound

Pipeline stage "%s" doesn't exist in pipeline "%s". Check the stage ID and try again.

# error.EnvironmentAttachFailed

Failed to create environment for stage: %s

# error.AuthTimeout

Authentication timed out. The environment was created but not yet authenticated. Re-run the command or authenticate manually via the org's DevOps Center setup.
