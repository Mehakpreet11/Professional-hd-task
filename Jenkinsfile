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
    // Tag images with BUILD_NUMBER unless explicitly provided
    TAG              = "${params.IMAGE_TAG ?: env.BUILD_NUMBER}"
    BACKEND_IMAGE    = "studymate-backend:${TAG}"
    FRONTEND_IMAGE   = "studymate-frontend:${TAG}"
    // Health endpoint of backend (staging/prod map to same port here)
    HEALTH_URL       = "http://localhost:5001/health"
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
          // Run mocha if tests/ exists
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
          // Publish coverage HTML if present (adjust path to your actual coverage output)
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
          // Write env file that docker compose will read for image names
          writeFile file: '.env.staging', text: """
BACKEND_IMAGE=${env.BACKEND_IMAGE}
FRONTEND_IMAGE=${env.FRONTEND_IMAGE}
""".trim()

          // Validate compose file before bringing it up
          bat 'docker compose --env-file .env.staging -f docker-compose.staging.yml config'

          // Bring up staging stack
          bat 'docker compose --env-file .env.staging -f docker-compose.staging.yml up -d'

          // Simple health check with retries (PowerShell on Windows agent)
          bat """
          powershell -Command "$ErrorActionPreference='Stop'; \
            for ($i=0; $i -lt 20; $i++) { \
              try { Invoke-WebRequest '${HEALTH_URL}' -UseBasicParsing | Out-Null; exit 0 } \
              catch { Start-Sleep -Seconds 3 } \
            } \
            Write-Error 'Backend health check failed after retries.'"
          """
        }
      }
    }

    stage('Release: Prod (manual/auto)') {
      when { branch 'main' }
      steps {
        script {
          if (params.AUTO_RELEASE) {
            echo 'AUTO_RELEASE=true -> skipping manual approval and promoting to Production.'
          } else {
            timeout(time: 15, unit: 'MINUTES') {
              input message: 'Promote to Production?', ok: 'Release'
            }
          }

          // Pass the exact images we just built into prod compose
          writeFile file: '.env.prod', text: """
BACKEND_IMAGE=${env.BACKEND_IMAGE}
FRONTEND_IMAGE=${env.FRONTEND_IMAGE}
""".trim()

          // Validate and deploy prod
          bat 'docker compose --env-file .env.prod -f docker-compose.prod.yml config'
          bat 'docker compose --env-file .env.prod -f docker-compose.prod.yml up -d'
        }
      }
    }

    stage('Monitoring Check') {
      when { branch 'main' }
      steps {
        echo 'Add your monitoring/verifications here (e.g., curl checks, synthetic tests, ping Grafana/Loki).'
      }
    }
  } // stages

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
