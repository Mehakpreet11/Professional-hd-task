pipeline {
  agent any

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'AUTO_RELEASE', defaultValue: false, description: 'If true, skip manual approval and release to Production automatically.')
    string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag (defaults to BUILD_NUMBER).')
  }

  environment {
    TAG            = "${params.IMAGE_TAG ?: env.BUILD_NUMBER}"
    BACKEND_IMAGE  = "studymate-backend:${TAG}"
    FRONTEND_IMAGE = "studymate-frontend:${TAG}"
    HEALTH_URL     = "http://localhost:5001/health"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[url: 'https://github.com/Mehakpreet11/Professional-hd-task.git']]
        ])
      }
    }

    stage('Backend: Install & Test (Mocha *.spec.js)') {
      steps {
        dir('backend') {
          bat 'npm ci'
          bat '''
          IF EXIST tests (
            npx mocha "tests/**/*.spec.js" --recursive --exit || (
              echo If this failed due to no spec files, add a sanity.spec.js; otherwise see error above.
              exit /b 1
            )
          ) ELSE (
            echo No "tests" directory; skipping mocha.
          )
          '''
        }
      }
      post {
        always {
          script {
            if (fileExists('backend\\reports\\coverage\\index.html')) {
              publishHTML(target: [
                reportDir: 'backend/reports/coverage',
                reportFiles: 'index.html',
                reportName: 'Backend Coverage',
                keepAll: true,
                alwaysLinkToLastBuild: true,
              ])
            }
          }
          archiveArtifacts artifacts: 'backend/**/*.log', fingerprint: true, allowEmptyArchive: true
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        echo "Building images: ${BACKEND_IMAGE} and ${FRONTEND_IMAGE}"
        bat "docker build -t ${BACKEND_IMAGE} -f backend\\Dockerfile backend"
        bat "docker build -t ${FRONTEND_IMAGE} -f frontend\\Dockerfile frontend"
      }
    }

    stage('Security (optional placeholder)') {
      steps {
        echo 'Add Trivy/Snyk later to complete Security stage.'
      }
    }

    stage('Deploy: Staging') {
      steps {
        script {
       
          writeFile file: '.env.staging', text: """
BACKEND_IMAGE=${env.BACKEND_IMAGE}
FRONTEND_IMAGE=${env.FRONTEND_IMAGE}
""".trim()
          bat 'docker compose --env-file .env.staging -f docker-compose.staging.yml config'
          bat 'docker compose --env-file .env.staging -f docker-compose.staging.yml up -d'
        }

        
        powershell '''
$ErrorActionPreference = "Stop"
for ($i=0; $i -lt 20; $i++) {
  try {
    Invoke-WebRequest "$env:HEALTH_URL" -UseBasicParsing | Out-Null
    exit 0
  } catch {
    Start-Sleep -Seconds 3
  }
}
throw "Backend health check failed after retries."
'''
      }
    }

    stage('Release: Prod (manual/auto)') {
      when { branch 'main' }
      steps {
        script {
          if (!params.AUTO_RELEASE) {
            timeout(time: 15, unit: 'MINUTES') {
              input message: 'Promote to Production?', ok: 'Release'
            }
          } else {
            echo 'AUTO_RELEASE=true -> promoting without manual approval.'
          }

          writeFile file: '.env.prod', text: """
BACKEND_IMAGE=${env.BACKEND_IMAGE}
FRONTEND_IMAGE=${env.FRONTEND_IMAGE}
""".trim()

          bat 'docker compose --env-file .env.prod -f docker-compose.prod.yml config'
          bat 'docker compose --env-file .env.prod -f docker-compose.prod.yml up -d'
        }
      }
    }

    stage('Monitoring Check') {
      when { branch 'main' }
      steps {
        echo 'Add monitoring/verifications here.'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '**/Dockerfile, docker-compose*.yml, .env.*', fingerprint: true, allowEmptyArchive: true
    }
    success {
      echo "Build ${env.BUILD_NUMBER} succeeded. Images: ${BACKEND_IMAGE}, ${FRONTEND_IMAGE}"
    }
    failure {
      echo "Build failed. Check the logs above."
    }
  }
}
