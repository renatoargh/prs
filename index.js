#!/usr/bin/env node

const API_BASEURL = 'https://api.github.com'
const {
  GITHUB_ORG,
  GITHUB_USER, 
  GITHUB_PASSWORD
} = process.env

const GREEN = '0e8a16'
const ORANGE = 'fbca04'
const RED = 'b60205'
const messagePool = require('./messagePool')

const package = require('./package.json')
const chalk = require('chalk')
const hyperlinker = require('hyperlinker')
const _ = require('underscore')

const searchIssuesUrl = () => `${API_BASEURL}/search/issues`
const orgIssuesUrl = () => `${API_BASEURL}/orgs/${GITHUB_ORG}/issues`
const request = require('request-promise-native').defaults({
    json: true,
    auth: {
      user: GITHUB_USER,
      pass: GITHUB_PASSWORD,
      sendImmediately: true
    },
    headers: {
      'User-Agent': `${package.name}-${package.version}`
    }
})

const getRandomMessage = () => messagePool[Math.floor(Math.random() * messagePool.length)]
const newTag = (name, color) => ({name, color})

async function handleIssues (issues) {
  const onlyPullRequests = issue => !!issue['pull_request']
  const repoName = issue => issue.repository.name

  for (const issue of issues.filter(i => !i.repository)) {
    issue.repository = await request.get(issue.repository_url)
  }

  const prs = _.groupBy(issues.filter(onlyPullRequests), repoName)

  if (Object.keys(prs).length) {
    // process.stdout.write(getRandomMessage() + '\n\n')
  } else {
    process.stdout.write('No PRs at this time!\n')
    // process.exit(0)
  }

  for (const repo in prs) {
    process.stderr.write(chalk.bold(repo.toUpperCase()) + '\n\n')

    for (const pr of prs[repo]) {
      // CI
      const {statuses_url} = await request.get(pr.pull_request.url)
      const statuses = await request.get(statuses_url)
      const lastStatus = statuses.shift()
      const ciPassing = lastStatus && lastStatus.state === 'success'

      if (lastStatus && lastStatus.state) {
        pr.labels.push({
          success: newTag('CI PASSING', GREEN),
          pending: newTag('CI PENDING', ORANGE),
          failure: newTag('CI FAILED', RED),
          error: newTag('CI ERROR', RED),
        }[lastStatus.state])
      }

      // REVIEWS
      const notMine = (review) => review.user.login !== GITHUB_USER
      const reviews_url = pr.pull_request.url + '/reviews'
      let reviews = await request.get(reviews_url)
      reviews = reviews.filter(notMine)

      const lastReview = reviews.pop()
      const isApproved = lastReview && lastReview.state === 'APPROVED'

      if (isApproved) {
        pr.labels.push(newTag('PEER REVIEWED', GREEN))
      } else {
        if (reviews.length) {
          pr.labels.push(newTag('UNDERGOING REVIEW', ORANGE))
        } else {
          pr.labels.push(newTag('AWAITING REVIEW', RED))
        }
      }

      // PULL REQUEST
      const isReadyToMerge = ciPassing && isApproved
      const channel = isReadyToMerge ? 'stderr' : 'stdout'
      let text = pr.title

      if (pr.labels) {
        text += ' (' + pr.labels.map(label => {
          return chalk.bgHex(label.color).black.bold(label.name)
        }).join(', ') + ')'
      }

      const prHtmlUrl = pr.pull_request.html_url
      text += '\n' + hyperlinker(prHtmlUrl, prHtmlUrl) + '\n'

      if (pr.user.login !== GITHUB_USER) {
        pr.user = await request.get(pr.user.url)
        
        text += 'Author: '
        if (pr.user.name) {
          text += `${pr.user.name} (@${pr.user.login})`
        } else {
          text += `@${pr.user.login}`
        }
      }

      process[channel].write(text + '\n\n')
    }
  }  
}

async function main() {
  console.log(chalk.cyan.bold('>>> MY PULL REQUESTS:\n'))

  let issues = await request.get(orgIssuesUrl(), {
    qs: {
      filter: 'created',
      state: 'open',
      sort: 'updated'
    }
  })

  await handleIssues(issues)

  console.log(chalk.cyan.bold('>>> PULL REQUESTS I AM INVOLVED:\n'))

  let issuesIAmInvolved = await request.get(searchIssuesUrl(), {
    qs: {
      q: `involves:${GITHUB_USER} type:pr is:open user:${GITHUB_ORG}`,
      sort: 'updated'
    }
  })

  issuesIAmInvolved = issuesIAmInvolved.items.filter(i => i.user.login !== GITHUB_USER)
  handleIssues(issuesIAmInvolved)

  console.log()
}

process.stderr.write('\033c')
main()
