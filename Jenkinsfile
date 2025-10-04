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
      steps {
        checkout scm
      }
    }

    stage('Backend: Install & Test (Mocha)') {
      steps {
        dir('backend') {
          // install deps
          bat 'npm ci'

          // run your existing mocha tests
          bat 'npm test'

          // OPTIONAL: if you later add coverage script ("npm run coverage"),
          // this will produce backend/reports/coverage/index.html
          bat 'IF EXIST package.json (npm run coverage) ELSE echo No coverage script, skipping.'

          // OPTIONAL: basic audit report (won’t fail the build)
          bat '''
          IF NOT EXIST reports\\audit mkdir reports\\audit
          cmd /c "npm audit --json > reports\\audit\\npm-audit.json" || ver >NUL
          '''
        }
      }
      post {
        always {
          // Publish coverage HTML only if it exists (prevents your earlier error)
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

          // Archive whatever reports exist (ok if empty)
          archiveArtifacts artifacts: 'backend/reports/**/*', allowEmptyArchive: true, fingerprint: true
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        // Build backend image (context = backend/)
        bat 'docker build -t %IMAGE_BACKEND%:%VERSION% -f backend\\Dockerfile backend'

        // Build static frontend image (context = frontend/)
        bat 'docker build -t %IMAGE_FRONTEND%:%VERSION% -f frontend\\Dockerfile frontend'
      }
    }

    stage('Security (optional quick placeholder)') {
      steps {
        echo 'Add Trivy/Snyk later for HD Security stage; placeholder keeps pipeline complete.'
      }
    }

    stage('Deploy: Staging') {
      steps {
        // Bring up staging stack
        bat 'docker compose -f docker-compose.staging.yml up -d'

        // Health check backend (use PowerShell for reliable curl)
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
          // Try health; error the build if prod looks down
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
      // Keep some docker/compose logs if needed (won’t fail if missing)
      archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
    }
  }
}
