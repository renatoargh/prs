# prs
Track your PRs and PRs you are involved

### Requirements
1. Node.js ~v8

### Instructions

1. Clone this repo
2. Get to the project folder and run `npm install -g`
3. Set the following environment variables: `GITHUB_ORG`, `GITHUB_USER` and `GITHUB_PASSWORD`. 
    1. You should use something like [envchain](https://github.com/sorah/envchain) for enhanced security.
4. Run it with `prs` (if using envchain then you should do `envchain github prs`, where `github` is the namespace for your github credentials on envchain). 
    1. Note that you don't need to provide your actual password, you can [create a personal token](https://github.com/settings/tokens). 
    2. If you have 2FA enabled then a personal token is your only option.