pipeline {
  agent any
  options { timestamps(); ansiColor('xterm') }

  

  environment {
    IMAGE_BACKEND  = 'studymate-backend'
    IMAGE_FRONTEND = 'studymate-frontend'
    VERSION        = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Backend: Install & Test (Mocha *.spec.js)') {
      steps {
        dir('backend') {
          bat 'npm ci'

          // Run mocha ONLY on *.spec.js. If none, skip cleanly.
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
          // If you later add coverage, you can publish it here conditionally:
          script {
            if (fileExists('backend/reports/coverage/index.html')) {
              publishHTML(target: [
                reportDir: 'backend/reports/coverage',
                reportFiles: 'index.html',
                reportName: 'Backend Coverage',
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true
              ])
            } else {
              echo 'No coverage HTML found; skipping publishHTML.'
            }
          }
          archiveArtifacts artifacts: 'backend/reports/**/*', allowEmptyArchive: true, fingerprint: true
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        bat 'docker build -t %IMAGE_BACKEND%:%VERSION% -f backend\\Dockerfile backend'
        bat 'docker build -t %IMAGE_FRONTEND%:%VERSION% -f frontend\\Dockerfile frontend'
      }
    }

    stage('Security (optional placeholder)') {
      steps {
        echo 'Add Trivy/Snyk later to complete Security stage.'
      }
    }

    stage('Deploy: Staging') {
      steps {
        bat 'docker compose -f docker-compose.staging.yml up -d'
        bat 'powershell -Command "Invoke-WebRequest http://localhost:5001/health -UseBasicParsing | Out-Null"'
      }
    }

    stage('Release: Prod (manual approval)') {
      steps {
        input message: 'Promote to Production?', ok: 'Release'
        bat 'docker compose -f docker-compose.prod.yml up -d'
        bat 'powershell -Command "Invoke-WebRequest http://localhost:5002/health -UseBasicParsing | Out-Null"'
      }
    }

    stage('Monitoring Check') {
      steps {
        script {
          def rc = bat(returnStatus: true, script: 'powershell -Command "Invoke-WebRequest http://localhost:5002/health -UseBasicParsing | Out-Null"')
          if (rc != 0) {
            error('Prod health check failed')
          } else {
            echo 'Prod health OK'
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
    }
  }
}
