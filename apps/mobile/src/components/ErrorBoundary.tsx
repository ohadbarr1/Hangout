import { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-warmwhite items-center justify-center px-8">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😬</Text>
          <Text
            className="text-charcoal text-xl text-center mb-3"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
          >
            Something went wrong
          </Text>
          <Text
            className="text-charcoal/50 text-sm text-center mb-8"
            style={{ fontFamily: 'Inter-Regular' }}
          >
            {this.state.message}
          </Text>
          <TouchableOpacity
            onPress={this.reset}
            className="bg-primary rounded-2xl px-8 py-4"
            activeOpacity={0.85}
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
